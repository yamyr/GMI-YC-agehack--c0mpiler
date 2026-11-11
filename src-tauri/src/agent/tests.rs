use std::path::{Path, PathBuf};

use super::locate::find_codex;
use super::output::{parse_turn, schema_json, MAX_MESSAGE_CHARS, MAX_OPTION_CHARS};
use super::prompt::build_prompt;
use super::status::{candidate_models, configured_model, is_model_rejected, is_signed_in};
use super::types::{AgentBrief, ErrorCode, Speaker, TranscriptLine};

fn brief(max_turns: u32) -> AgentBrief {
    AgentBrief {
        agent_role: "Agely onboarding agent".into(),
        goal: "Learn about Margaret's career and proudest supplier fix.".into(),
        background: "Margaret Okafor, 68, retired procurement director from Ohio.".into(),
        reply_as: "Margaret".into(),
        max_turns,
    }
}

fn line(speaker: Speaker, text: &str) -> TranscriptLine {
    TranscriptLine {
        speaker,
        text: text.into(),
    }
}

// ── output.rs ────────────────────────────────────────────────────────────────

#[test]
fn parses_a_valid_turn() {
    let raw = r#"{"message":"What did you do before you retired?","options":["I ran procurement.","I negotiated contracts.","I managed suppliers."],"done":false}"#;
    let turn = parse_turn(raw, 0, 5).expect("valid");
    assert_eq!(turn.message, "What did you do before you retired?");
    assert_eq!(turn.options.len(), 3);
    assert!(!turn.done);
}

#[test]
fn rejects_the_wrong_number_of_options() {
    for options in [r#"["a","b"]"#, r#"["a","b","c","d"]"#, r#"["a","","c"]"#] {
        let raw = format!(r#"{{"message":"Hi","options":{options},"done":false}}"#);
        let err = parse_turn(&raw, 0, 5).expect_err("must reject");
        assert_eq!(err.code, ErrorCode::Malformed, "{options}");
    }
}

#[test]
fn rejects_overlong_options_and_messages_and_empty_messages() {
    let long_option = "x".repeat(MAX_OPTION_CHARS + 1);
    let raw = format!(r#"{{"message":"Hi","options":["{long_option}","b","c"],"done":false}}"#);
    assert_eq!(
        parse_turn(&raw, 0, 5).unwrap_err().code,
        ErrorCode::Malformed
    );

    let long_message = "y".repeat(MAX_MESSAGE_CHARS + 1);
    let raw = format!(r#"{{"message":"{long_message}","options":["a","b","c"],"done":false}}"#);
    assert_eq!(
        parse_turn(&raw, 0, 5).unwrap_err().code,
        ErrorCode::Malformed
    );

    let raw = r#"{"message":"  ","options":["a","b","c"],"done":false}"#;
    assert_eq!(
        parse_turn(raw, 0, 5).unwrap_err().code,
        ErrorCode::Malformed
    );
}

#[test]
fn rejects_non_json() {
    assert_eq!(
        parse_turn("Sure! Here you go.", 0, 5).unwrap_err().code,
        ErrorCode::Malformed
    );
}

#[test]
fn forces_done_on_the_last_allowed_turn() {
    let raw = r#"{"message":"Thank you.","options":["a","b","c"],"done":false}"#;
    assert!(parse_turn(raw, 4, 5).unwrap().done);
    assert!(!parse_turn(raw, 3, 5).unwrap().done);
}

#[test]
fn schema_requires_message_three_options_and_done() {
    let schema: serde_json::Value = serde_json::from_str(&schema_json()).unwrap();
    let required: Vec<&str> = schema["required"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert_eq!(required, ["message", "options", "done"]);
    assert_eq!(schema["properties"]["options"]["minItems"], 3);
    assert_eq!(schema["properties"]["options"]["maxItems"], 3);
    assert_eq!(schema["additionalProperties"], false);
}

// ── prompt.rs ────────────────────────────────────────────────────────────────

#[test]
fn prompt_carries_role_goal_background_and_rules() {
    let prompt = build_prompt(&brief(5), &[]);
    for needle in [
        "Agely onboarding agent",
        "Learn about Margaret's career",
        "Margaret Okafor, 68",
        "written as Margaret",
        "160 characters",
        "legal, medical or financial advice",
        "publish, book, accept or pay",
        "Do not run commands or read files",
        "at most 5",
    ] {
        assert!(prompt.contains(needle), "prompt is missing: {needle}");
    }
    assert!(prompt.contains("(no messages yet"));
}

#[test]
fn prompt_lists_the_transcript_in_order_by_speaker() {
    let transcript = [
        line(Speaker::Agent, "What did you do?"),
        line(Speaker::Person, "I ran procurement."),
        line(Speaker::Agent, "For how long?"),
    ];
    let prompt = build_prompt(&brief(5), &transcript);
    let a = prompt.find("Agent: What did you do?").expect("first line");
    let b = prompt
        .find("Margaret: I ran procurement.")
        .expect("second line");
    let c = prompt.find("Agent: For how long?").expect("third line");
    assert!(a < b && b < c);
    assert!(prompt.contains("This is agent turn 3 of at most 5"));
}

// ── status.rs ────────────────────────────────────────────────────────────────

#[test]
fn classifies_login_status() {
    assert!(is_signed_in(true, "Logged in using ChatGPT\n"));
    assert!(is_signed_in(true, "Logged in using an API key - sk-***"));
    assert!(!is_signed_in(true, "Not logged in"));
    assert!(!is_signed_in(false, "Logged in using ChatGPT"));
}

#[test]
fn detects_a_model_the_plan_rejects() {
    assert!(is_model_rejected(
        r#"ERROR: {"error":{"message":"The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.","code":"model_not_found"}}"#
    ));
    assert!(!is_model_rejected(
        "ERROR: stream disconnected before completion"
    ));
}

#[test]
fn candidate_models_honour_the_override() {
    assert_eq!(
        candidate_models(Some("gpt-6.1"), Some("gpt-6.1-sol")),
        vec!["gpt-6.1".to_string()]
    );
    assert_eq!(
        candidate_models(Some("  "), None),
        candidate_models(None, None)
    );
    assert_eq!(
        candidate_models(None, None),
        vec!["gpt-5.4-mini", "gpt-5.5", "codex-auto-review"]
    );
}

#[test]
fn candidate_models_try_the_users_codex_model_first_without_duplicates() {
    assert_eq!(
        candidate_models(None, Some("gpt-6.1-sol")),
        vec![
            "gpt-6.1-sol",
            "gpt-5.4-mini",
            "gpt-5.5",
            "codex-auto-review"
        ]
    );
    assert_eq!(
        candidate_models(None, Some("gpt-5.5")),
        vec!["gpt-5.5", "gpt-5.4-mini", "codex-auto-review"]
    );
}

#[test]
fn reads_the_top_level_model_from_codex_config() {
    let toml = "model = \"gpt-6.1-sol\"\nmodel_reasoning_effort = \"high\"\n\n[profiles.fast]\nmodel = \"other\"\n";
    assert_eq!(configured_model(toml).as_deref(), Some("gpt-6.1-sol"));
    assert_eq!(configured_model("[profiles.x]\nmodel = \"nested\"\n"), None);
    assert_eq!(
        configured_model("# model = \"commented\"\nmodel='single'\n").as_deref(),
        Some("single")
    );
    assert_eq!(configured_model(""), None);
}

#[test]
fn exec_args_use_the_requested_reasoning_effort() {
    let args = super::run::exec_args(Path::new("/tmp/x"), "m", "low");
    let joined = args.join(" ");
    assert!(
        joined.contains("-c model_reasoning_effort=\"low\""),
        "{joined}"
    );
    assert!(joined.contains("--ignore-user-config"));
    assert!(joined.contains("--sandbox read-only"));
}

// ── locate.rs ────────────────────────────────────────────────────────────────

#[test]
fn explicit_binary_wins_and_must_exist() {
    let only = |p: &Path| p == Path::new("/custom/codex");
    assert_eq!(
        find_codex(Some("/custom/codex"), Some("/usr/bin"), None, only),
        Some(PathBuf::from("/custom/codex"))
    );
    assert_eq!(
        find_codex(Some("/nonexistent/codex"), Some("/custom"), None, only),
        None
    );
}

#[test]
fn searches_path_then_common_install_dirs() {
    let on_path =
        |p: &Path| p == Path::new("/b/codex") || p == Path::new("/opt/homebrew/bin/codex");
    assert_eq!(
        find_codex(None, Some("/a:/b"), Some(Path::new("/Users/x")), on_path),
        Some(PathBuf::from("/b/codex"))
    );

    let npm_global = |p: &Path| p == Path::new("/Users/x/.npm-global/bin/codex");
    assert_eq!(
        find_codex(
            None,
            Some("/usr/bin"),
            Some(Path::new("/Users/x")),
            npm_global
        ),
        Some(PathBuf::from("/Users/x/.npm-global/bin/codex"))
    );

    assert_eq!(
        find_codex(None, None, Some(Path::new("/Users/x")), |_| false),
        None
    );
}

// ── Real Codex (opt-in): cargo test --manifest-path src-tauri/Cargo.toml -- --ignored --nocapture ──

#[test]
#[ignore = "calls the real Codex CLI; needs it installed and signed in"]
fn live_codex_check_and_one_turn() {
    let (status, ready) = super::check(super::locate_codex());
    println!("status: {status:?}");
    let ready = ready.expect("live agent should be ready on this machine");
    let started = std::time::Instant::now();
    let turn = super::run_turn(
        ready.bin,
        ready.model,
        super::TurnRequest {
            brief: brief(5),
            transcript: vec![],
        },
    )
    .expect("a valid turn");
    println!("{:?} in {:?}", turn, started.elapsed());
    assert_eq!(turn.options.len(), 3);
}
