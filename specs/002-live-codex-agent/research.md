# Research: Live Agent via the Local Codex CLI

Findings from probing `codex-cli 0.139.0` on the development machine (2026-11-11).

## R1. Use the CLI, not the Claude Code plugin

- **Decision**: The app shells out to the `codex` CLI from Rust.
- **Rationale**: The Codex *plugin* is a Claude Code integration and is not available to the app at
  runtime. The CLI it wraps reuses the ChatGPT sign-in in `~/.codex/auth.json`, so no API key is
  needed (FR-006).
- **Alternatives**: OpenAI API key (deferred; same command interface later); `codex mcp-server` or
  `app-server` (long-lived process, more moving parts for a demo).

## R2. Invocation

```
codex exec --ignore-user-config --ignore-rules --skip-git-repo-check --ephemeral
  --sandbox read-only -C <empty temp dir> -m <model>
  --disable apps --disable browser_use --disable computer_use
  --output-schema <schema.json> -o <out.json> "<prompt>"   (stdin = /dev/null)
```

- `codex exec` **waits on stdin** when it is a pipe ("Reading additional input from stdin…") —
  stdin must be closed (`Stdio::null()`), or the call hangs forever.
- `--ignore-user-config` is required: the user's config loaded several MCP servers (slow, auth
  errors) and set a model the ChatGPT plan rejects. Auth still works because it lives in
  `auth.json`, not the config.
- `--output-schema` + `-o` gives a clean JSON file of the final message; parse that, not stdout.
- Typical latency: 7–10 s for a trivial reply; budget 60 s timeout (FR-015).

## R3. Model availability with ChatGPT sign-in

- `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-6`, `gpt-6-mini` and the user's
  configured `gpt-6.1-sol` all returned *"not supported when using Codex with a ChatGPT
  account"* for this account; only `codex-auto-review` answered.
- **Decision**: Model is configurable via `AGELY_CODEX_MODEL`. Without it, the readiness check
  probes candidates in order `gpt-5.4-mini`, `gpt-5.5`, `codex-auto-review` with a one-word prompt
  and keeps the first that answers for the session. The status names the model in use (FR-005).
- **Rationale**: Plans differ; probing finds a working model with no manual setup, and the env var
  makes the choice explicit for anyone who knows their plan.

## R4. Locating the binary from a GUI app

- **Decision**: `AGELY_CODEX_BIN` if set; else each `PATH` entry; else common install dirs
  (`~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, `~/.bun/bin`,
  `~/.volta/bin`).
- **Rationale**: Apps launched from Finder get a minimal `PATH`; `codex` here lives in
  `~/.npm-global/bin`.

## R5. Sign-in check

- `codex login status` prints `Logged in using ChatGPT` (or an API-key variant) when signed in;
  anything else, or a non-zero exit, is `not_signed_in` with the fix `codex login`.

## R6. Containment (FR-017)

- Codex's command runner cannot be removed entirely. Contain it: empty temp `-C` dir, read-only
  sandbox (commands get no network and cannot write), apps/browser/computer-use disabled, user
  config and rules ignored, prompt forbids commands and file reads, `--ephemeral` (no session saved).

## R7. Stale responses (FR-016)

- **Decision**: Each pending request carries a `requestId`; the reducer accepts a result only if it
  matches the conversation's current pending id. Jump/restart/back reset or keep state; a late
  response for a discarded id is ignored. Rust calls are not cancelled (they finish or time out).

## R8. Testing without a real model

- Rust: pure functions (prompt, parse, classify, locate order) are unit-tested; `run.rs` is a thin
  wrapper verified manually (quickstart).
- Frontend: the Playwright Tauri stub returns canned `agent_status` / `agent_turn`, overridable per
  test, so live journeys are deterministic in CI.
