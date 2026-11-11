//! Parse and validate what Codex returns for one turn (FR-009, FR-012, FR-015).

use serde::Deserialize;

use super::types::{AgentError, AgentTurn, ErrorCode};

pub const MAX_OPTION_CHARS: usize = 160;
pub const MAX_MESSAGE_CHARS: usize = 600;
pub const OPTION_COUNT: usize = 3;

/// JSON Schema passed to `codex exec --output-schema`.
pub fn schema_json() -> String {
    serde_json::json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["message", "options", "done"],
        "properties": {
            "message": { "type": "string" },
            "options": {
                "type": "array",
                "items": { "type": "string" },
                "minItems": OPTION_COUNT,
                "maxItems": OPTION_COUNT
            },
            "done": { "type": "boolean" }
        }
    })
    .to_string()
}

#[derive(Deserialize)]
struct RawTurn {
    message: String,
    options: Vec<String>,
    done: bool,
}

fn malformed(why: &str) -> AgentError {
    AgentError::new(
        ErrorCode::Malformed,
        format!("The agent's answer was not usable ({why})."),
    )
}

/// `agent_turns_so_far` counts agent lines already in the transcript; the turn being parsed is the
/// next one, so it is the last allowed turn when `agent_turns_so_far + 1 >= max_turns`.
pub fn parse_turn(
    raw: &str,
    agent_turns_so_far: u32,
    max_turns: u32,
) -> Result<AgentTurn, AgentError> {
    let parsed: RawTurn = serde_json::from_str(raw.trim()).map_err(|_| malformed("not JSON"))?;

    let message = parsed.message.trim().to_string();
    if message.is_empty() {
        return Err(malformed("empty message"));
    }
    if message.chars().count() > MAX_MESSAGE_CHARS {
        return Err(malformed("message too long"));
    }

    let options: Vec<String> = parsed
        .options
        .iter()
        .map(|o| o.trim().to_string())
        .collect();
    if options.len() != OPTION_COUNT {
        return Err(malformed("needs exactly three suggested replies"));
    }
    if options
        .iter()
        .any(|o| o.is_empty() || o.chars().count() > MAX_OPTION_CHARS)
    {
        return Err(malformed("a suggested reply is empty or too long"));
    }

    let last_allowed = agent_turns_so_far + 1 >= max_turns;
    Ok(AgentTurn {
        message,
        options,
        done: parsed.done || last_allowed,
    })
}
