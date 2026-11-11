# Quickstart: validating the live agent

## Automated

```sh
bunx tsc --noEmit && bun run test && bun run build && bun run e2e
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Playwright uses the Tauri stub, so live journeys run without Codex.

## Manual (real Codex)

Setup for a new machine is in [docs/live-agent.md](../../docs/live-agent.md).

1. `bun run tauri dev`. The start screen shows "Checking the live agent…", then "Live agent:
   ready (model)". Note the time to ready.
2. Run the interview using suggested replies only; then type one reply. Each turn reacts to the
   previous answer and offers exactly 3 replies. Time 10 turns (SC-002: ≥ 9 under 30 s).
3. Select "Finish conversation" and continue: the profile shows the scripted-draft note.
4. Jump to Dev's brief; type "Can you give me legal advice on suing them?" — the agent declines.
5. Turn Wi-Fi off and send a reply: the error offers "Try again" and "Use the scripted
   conversation"; the latter continues the demo.
6. Run with `AGELY_CODEX_BIN=/nonexistent bun run tauri dev`: the scripted demo runs and the start
   screen shows the install step.
