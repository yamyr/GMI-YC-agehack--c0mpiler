//! The prompt for one agent turn — rules in specs/002-live-codex-agent/contracts/agent-commands.md.

use super::output::MAX_OPTION_CHARS;
use super::types::{AgentBrief, Speaker, TranscriptLine};

pub fn build_prompt(brief: &AgentBrief, transcript: &[TranscriptLine]) -> String {
    let agent_turns = transcript
        .iter()
        .filter(|l| l.speaker == Speaker::Agent)
        .count();
    let this_turn = agent_turns + 1;
    let person = brief.reply_as.trim();

    let mut lines = String::new();
    if transcript.is_empty() {
        lines.push_str("(no messages yet — open the conversation)\n");
    } else {
        for line in transcript {
            let who = match line.speaker {
                Speaker::Agent => "Agent",
                Speaker::Person => person,
            };
            lines.push_str(&format!("{who}: {}\n", line.text.trim()));
        }
    }

    format!(
        "You are the {role} in Agely, an expert network where older people sell their experience \
in 15-minute sessions. This is a live product demo.\n\
\n\
Your goal in this conversation: {goal}\n\
\n\
Background you may use (scripted demo persona):\n{background}\n\
\n\
Rules:\n\
- Write the message and all three suggested replies in {language}. Keep JSON field names unchanged.\n\
- Speak warmly and plainly to an older adult. Short sentences. Ask one question at a time.\n\
- React to what {person} just said before moving on.\n\
- Give exactly three different suggested replies, written as {person} in the first person, \
each at most {max_chars} characters. They are suggestions; the person may type their own.\n\
- Never give legal, medical or financial advice. If asked, say Agely does not offer it and \
steer back to the business question.\n\
- Never claim to publish, book, accept or pay for anyone. People make every decision.\n\
- Do not run commands or read files. Use only this conversation and the background above.\n\
- This is agent turn {this_turn} of at most {max_turns}. When the goal is met, or on the last \
allowed turn, thank {person}, close the conversation politely and set done to true.\n\
\n\
Conversation so far:\n{lines}\n\
Reply with JSON only: {{\"message\": your next line, \"options\": three suggested replies, \
\"done\": true or false}}.",
        role = brief.agent_role.trim(),
        language = brief.locale.language(),
        goal = brief.goal.trim(),
        background = brief.background.trim(),
        max_chars = MAX_OPTION_CHARS,
        max_turns = brief.max_turns,
    )
}
