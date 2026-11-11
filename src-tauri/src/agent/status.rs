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

pub fn candidate_models(env_model: Option<&str>) -> Vec<String> {
    match env_model.map(str::trim).filter(|m| !m.is_empty()) {
        Some(model) => vec![model.to_string()],
        None => DEFAULT_CANDIDATES.iter().map(|m| m.to_string()).collect(),
    }
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
