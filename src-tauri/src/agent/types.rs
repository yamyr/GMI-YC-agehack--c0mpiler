//! IPC shapes — see specs/002-live-codex-agent/data-model.md.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Speaker {
    Agent,
    Person,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptLine {
    pub speaker: Speaker,
    pub text: String,
}

/// Per-conversation instructions supplied by the frontend (`src/demo/live/briefs.ts`).
/// Extra fields the frontend sends (e.g. `conversation`) are ignored.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentBrief {
    pub agent_role: String,
    pub goal: String,
    pub background: String,
    /// "Margaret" or "Dev": whose voice the suggested replies use.
    pub reply_as: String,
    pub max_turns: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TurnRequest {
    pub brief: AgentBrief,
    pub transcript: Vec<TranscriptLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AgentTurn {
    pub message: String,
    pub options: Vec<String>,
    pub done: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    NotReady,
    Timeout,
    Failed,
    Malformed,
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentError {
    pub code: ErrorCode,
    pub message: String,
}

impl AgentError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum StatusState {
    Ready,
    NotInstalled,
    NotSignedIn,
    ModelUnavailable,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentStatus {
    pub state: StatusState,
    pub model: Option<String>,
    pub detail: String,
    pub fix: Option<String>,
}
