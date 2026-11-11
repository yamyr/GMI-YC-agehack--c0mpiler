//! Live agent via the local Codex CLI — specs/002-live-codex-agent.
//!
//! The webview never spawns processes or sees paths: it calls `agent_status` and `agent_turn`.

mod locate;
mod output;
mod prompt;
mod run;
mod status;
mod types;

#[cfg(test)]
mod tests;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::State;

pub use types::{AgentError, AgentStatus, AgentTurn, TurnRequest};
use types::{ErrorCode, Speaker, StatusState};

struct Ready {
    bin: PathBuf,
    model: String,
}

#[derive(Default)]
pub struct AgentState {
    status: Mutex<Option<AgentStatus>>,
    ready: Mutex<Option<Ready>>,
}

impl AgentState {
    pub fn new() -> Self {
        Self::default()
    }
}

fn env(name: &str) -> Option<String> {
    std::env::var(name).ok()
}

/// Reasoning effort for live turns: low keeps a turn around 10 s. Override with AGELY_CODEX_EFFORT.
fn effort() -> String {
    env("AGELY_CODEX_EFFORT")
        .map(|e| e.trim().to_string())
        .filter(|e| matches!(e.as_str(), "minimal" | "low" | "medium" | "high"))
        .unwrap_or_else(|| "low".into())
}

/// The model from the user's Codex config ($CODEX_HOME or ~/.codex), tried first.
fn user_codex_model() -> Option<String> {
    let home = env("CODEX_HOME")
        .map(PathBuf::from)
        .or_else(|| env("HOME").map(|h| PathBuf::from(h).join(".codex")))?;
    let text = std::fs::read_to_string(home.join("config.toml")).ok()?;
    status::configured_model(&text)
}

fn locate_codex() -> Option<PathBuf> {
    let home = env("HOME").map(PathBuf::from);
    locate::find_codex(
        env("AGELY_CODEX_BIN").as_deref(),
        env("PATH").as_deref(),
        home.as_deref(),
        Path::is_file,
    )
}

/// Locate → sign-in → first model that answers. Blocking; run off the async runtime.
fn check(bin: Option<PathBuf>) -> (AgentStatus, Option<Ready>) {
    let Some(bin) = bin else {
        return (status::not_installed(), None);
    };
    let Ok(scratch) = run::Scratch::new() else {
        return (status::error("could not create a temporary folder"), None);
    };

    match run::run(
        &bin,
        &["login".into(), "status".into()],
        &scratch,
        None,
        run::LOGIN_TIMEOUT,
    ) {
        Ok(out) if status::is_signed_in(out.exit_ok, &out.log) => {}
        Ok(_) => return (status::not_signed_in(), None),
        Err(run::RunError::Timeout) => return (status::error("Codex did not answer"), None),
        Err(run::RunError::Spawn(e)) => return (status::error(&e), None),
    }

    let candidates = status::candidate_models(
        env("AGELY_CODEX_MODEL").as_deref(),
        user_codex_model().as_deref(),
    );
    for model in &candidates {
        let out_file = scratch.path().join("probe.txt");
        let mut args = run::exec_args(scratch.path(), model, &effort());
        args.extend([
            "-o".into(),
            out_file.display().to_string(),
            "Reply with the single word OK.".into(),
        ]);
        match run::run(&bin, &args, &scratch, Some(&out_file), run::PROBE_TIMEOUT) {
            Ok(out) if out.exit_ok && out.last_message.is_some() => {
                let ready = Ready {
                    bin: bin.clone(),
                    model: model.clone(),
                };
                return (status::ready(model), Some(ready));
            }
            Ok(out) if status::is_model_rejected(&out.log) => continue,
            Ok(out) => return (status::error(&run::error_line(&out.log)), None),
            Err(run::RunError::Timeout) => return (status::error("Codex timed out"), None),
            Err(run::RunError::Spawn(e)) => return (status::error(&e), None),
        }
    }
    (status::model_unavailable(&candidates), None)
}

/// FR-001, FR-003: cached after the first check; `recheck` runs it again.
#[tauri::command]
pub async fn agent_status(
    state: State<'_, AgentState>,
    recheck: bool,
) -> Result<AgentStatus, String> {
    if !recheck {
        if let Some(cached) = state.status.lock().map_err(|e| e.to_string())?.clone() {
            return Ok(cached);
        }
    }
    let bin = locate_codex();
    let (status, ready) = tauri::async_runtime::spawn_blocking(move || check(bin))
        .await
        .map_err(|e| e.to_string())?;
    *state.status.lock().map_err(|e| e.to_string())? = Some(status.clone());
    *state.ready.lock().map_err(|e| e.to_string())? = ready;
    Ok(status)
}

fn run_turn(bin: PathBuf, model: String, request: TurnRequest) -> Result<AgentTurn, AgentError> {
    let failed = |m: String| AgentError::new(ErrorCode::Failed, m);
    let scratch = run::Scratch::new().map_err(|e| failed(e.to_string()))?;
    let schema = scratch.path().join("schema.json");
    let out_file = scratch.path().join("out.json");
    std::fs::write(&schema, output::schema_json()).map_err(|e| failed(e.to_string()))?;

    let agent_turns = request
        .transcript
        .iter()
        .filter(|l| l.speaker == Speaker::Agent)
        .count() as u32;
    let mut args = run::exec_args(scratch.path(), &model, &effort());
    args.extend([
        "--output-schema".into(),
        schema.display().to_string(),
        "-o".into(),
        out_file.display().to_string(),
        prompt::build_prompt(&request.brief, &request.transcript),
    ]);

    match run::run(&bin, &args, &scratch, Some(&out_file), run::TURN_TIMEOUT) {
        Ok(out) => match (out.exit_ok, out.last_message) {
            (true, Some(raw)) => output::parse_turn(&raw, agent_turns, request.brief.max_turns),
            _ => Err(failed(format!(
                "Codex could not answer: {}",
                run::error_line(&out.log)
            ))),
        },
        Err(run::RunError::Timeout) => Err(AgentError::new(
            ErrorCode::Timeout,
            "The agent took longer than 60 seconds.",
        )),
        Err(run::RunError::Spawn(e)) => Err(failed(e)),
    }
}

/// One live agent turn (FR-008–FR-017).
#[tauri::command]
pub async fn agent_turn(
    state: State<'_, AgentState>,
    request: TurnRequest,
) -> Result<AgentTurn, AgentError> {
    let ready = {
        let guard = state
            .ready
            .lock()
            .map_err(|e| AgentError::new(ErrorCode::Failed, e.to_string()))?;
        let is_ready = state
            .status
            .lock()
            .map(|s| matches!(s.as_ref().map(|s| s.state), Some(StatusState::Ready)))
            .unwrap_or(false);
        match (guard.as_ref(), is_ready) {
            (Some(r), true) => (r.bin.clone(), r.model.clone()),
            _ => {
                return Err(AgentError::new(
                    ErrorCode::NotReady,
                    "The live agent is not ready.",
                ))
            }
        }
    };
    tauri::async_runtime::spawn_blocking(move || run_turn(ready.0, ready.1, request))
        .await
        .map_err(|e| AgentError::new(ErrorCode::Failed, e.to_string()))?
}
