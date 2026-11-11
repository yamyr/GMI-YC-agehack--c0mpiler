//! Readiness classification (research R3, R5).

use super::types::{AgentStatus, StatusState};

/// Tried in order when `AGELY_CODEX_MODEL` is not set. ChatGPT plans allow different models.
pub const DEFAULT_CANDIDATES: [&str; 3] = ["gpt-5.4-mini", "gpt-5.5", "codex-auto-review"];

pub fn is_signed_in(exit_ok: bool, output: &str) -> bool {
    exit_ok && output.contains("Logged in")
}

pub fn is_model_rejected(output: &str) -> bool {
    output.contains("not supported when using Codex with a ChatGPT account")
        || output.contains("model_not_found")
}

/// `AGELY_CODEX_MODEL` alone when set; otherwise the model from the user's own Codex config
/// first (their plan allows it), then the defaults, without duplicates.
pub fn candidate_models(env_model: Option<&str>, configured: Option<&str>) -> Vec<String> {
    if let Some(model) = env_model.map(str::trim).filter(|m| !m.is_empty()) {
        return vec![model.to_string()];
    }
    let mut models: Vec<String> = configured
        .map(str::trim)
        .filter(|m| !m.is_empty())
        .map(str::to_string)
        .into_iter()
        .collect();
    for model in DEFAULT_CANDIDATES {
        if !models.iter().any(|m| m == model) {
            models.push(model.to_string());
        }
    }
    models
}

/// The top-level `model = "..."` in Codex's config.toml (before any `[table]`). We only read this
/// one value; the rest of the user's config is ignored on purpose (`--ignore-user-config`).
pub fn configured_model(config_toml: &str) -> Option<String> {
    for line in config_toml.lines() {
        let line = line.trim();
        if line.starts_with('[') {
            return None;
        }
        let Some(rest) = line.strip_prefix("model") else {
            continue;
        };
        let Some(value) = rest.trim_start().strip_prefix('=') else {
            continue;
        };
        let value = value.trim().trim_matches(|c| c == '"' || c == '\'');
        if !value.is_empty() {
            return Some(value.to_string());
        }
    }
    None
}

pub fn ready(model: &str) -> AgentStatus {
    AgentStatus {
        state: StatusState::Ready,
        model: Some(model.to_string()),
        detail: format!("Live agent ready, using {model} through your Codex sign-in."),
        fix: None,
    }
}

pub fn not_installed() -> AgentStatus {
    AgentStatus {
        state: StatusState::NotInstalled,
        model: None,
        detail: "Codex is not installed on this computer, so the scripted conversations are used."
            .into(),
        fix: Some(
            "Install it with: npm install -g @openai/codex — then select Check again.".into(),
        ),
    }
}

pub fn not_signed_in() -> AgentStatus {
    AgentStatus {
        state: StatusState::NotSignedIn,
        model: None,
        detail: "Codex is installed but not signed in.".into(),
        fix: Some(
            "In a terminal run: codex login — sign in with ChatGPT, then select Check again."
                .into(),
        ),
    }
}

pub fn model_unavailable(tried: &[String]) -> AgentStatus {
    AgentStatus {
        state: StatusState::ModelUnavailable,
        model: None,
        detail: format!(
            "Your ChatGPT plan doesn't allow these models in Codex: {}.",
            tried.join(", ")
        ),
        fix: Some(
            "Set AGELY_CODEX_MODEL to a model your plan allows, restart the app, then Check again."
                .into(),
        ),
    }
}

pub fn error(why: &str) -> AgentStatus {
    AgentStatus {
        state: StatusState::Error,
        model: None,
        detail: format!("The live agent check failed: {why}"),
        fix: Some("Check your internet connection, then select Check again.".into()),
    }
}
