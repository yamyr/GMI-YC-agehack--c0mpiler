# Implementation Plan: Live Agent via the Local Codex CLI

**Branch**: `feat/live-agent` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-live-codex-agent/spec.md`

## Summary

Add a Rust `agent` module to the Tauri shell that locates the local `codex` CLI, checks sign-in
and a working model, and runs one conversation turn per call with `codex exec`, using a JSON
output schema so every turn returns `{ message, options[3], done }`. Calls are boxed in: an
empty temp working folder, a read-only sandbox, user config and rules ignored, and the apps,
browser and computer-use features disabled. Stdin is closed, with a 60 s timeout. The
frontend gets a live-conversation layer (state, side-effect runner, UI) that replaces the scripted
transcript on the three conversation steps when the agent is ready and enabled, and falls back to
the scripted turns on demand. Everything else in the walkthrough is unchanged.

## Technical Context

**Language/Version**: Rust 1.99 (Tauri 2 shell), TypeScript 5.8 strict + React 19

**Primary Dependencies**: Existing only (tauri, serde, serde_json). `std::process` for the CLI;
no new crates, no new npm packages.

**Storage**: None (temp files for the schema/output are deleted after each call)

**Testing**: `cargo test` (prompt building, output parsing/validation, error classification, binary
lookup order); Vitest (live state transitions, stale-response discarding, gating); Playwright with
the Tauri IPC stub returning canned `agent_status` / `agent_turn` (live journey, fallback, setup
panel)

**Target Platform**: macOS desktop first (Tauri); the browser preview always reports "live agent
unavailable" and stays scripted

**Project Type**: desktop-app

**Performance Goals**: an agent turn within 30 s in 90% of cases (SC-002); readiness check runs in
the background and never blocks the start screen

**Constraints**: no API key (FR-006); 60 s turn timeout; exactly 3 options ≤ 160 chars (FR-009);
max 5 agent turns (FR-012); stale responses discarded (FR-016); data minimisation (FR-017)

**Scale/Scope**: 1 presenter, 3 conversations, ≤ 5 agent turns each

## Constitution Check

| Principle | Compliance | Status |
|-----------|-----------|--------|
| I. Older Adults First | Replies are offered as 3 large buttons; typing is the alternative. Same tokens and type floor; thinking state announced politely. | PASS |
| II. People Decide, Agents Propose | The agent only writes its line and *suggests* replies; the presenter picks or types. It cannot publish, book or pay (prompt rule + no tool access to the app). Finishing a conversation is a human action or the agent's polite close. | PASS |
| III. Honest by Default | Live turns labelled "Live agent (Codex)"; scripted draft after a live chat labelled as scripted; start screen discloses that text goes to OpenAI via the signed-in account; no fake "live" when unavailable. | PASS |
| IV. Test-First | Rust parsing/prompt/classification tests and Vitest state tests are written first; Playwright covers live, fallback and setup via the stub. | PASS |
| V. Simple Until Proven Otherwise | Network use is required by this spec (Principle V allows it once specified). No new dependencies; the CLI sits behind an `agent_*` command interface so an API-key provider can be added later. | PASS |

**Post-design re-check**: PASS — no violations; Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-live-codex-agent/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/agent-commands.md   # Tauri IPC contract + CLI invocation
└── tasks.md
```

### Source Code

```text
src-tauri/src/
├── lib.rs                    # register agent_status, agent_turn; manage AgentState
└── agent/
    ├── mod.rs                # commands + AgentState (cached status)
    ├── locate.rs (+tests)    # find codex: AGELY_CODEX_BIN, PATH, common install dirs
    ├── prompt.rs (+tests)    # build the turn prompt from AgentBrief + transcript
    ├── output.rs (+tests)    # parse/validate {message, options[3], done}; schema JSON
    ├── status.rs (+tests)    # classify login/model-probe output into AgentStatus
    └── run.rs                # spawn codex exec (stdin null, temp dir, timeout, kill)

src/demo/live/
├── types.ts                  # AgentStatus, AgentBrief, LiveTurn, LiveConversation (mirror Rust)
├── client.ts (+test)         # invoke wrappers; browser preview → "unavailable"
├── briefs.ts                 # agent role/goal/background per conversation
├── state.ts (+test)          # pure transitions: request, receive (requestId-checked), fail,
│                             # reply, finish, useScripted, reset
├── useLiveRunner.ts          # effect: runs pending requests, dispatches results
├── LiveConversation.tsx      # transcript, thinking, 3 options, typed reply, finish, errors
└── LiveAgentPanel.tsx        # start-screen status, model, privacy note, toggle, fix steps, check again

src/demo/state/reducer.ts     # DemoState.live + new actions; gating + jump/restart reset
src/demo/screens/*            # InterviewScreen uses LiveConversation when live; Profile/Brief/
                              # Workflow show "scripted draft" note after a live chat
e2e/tauriStub.ts              # canned agent_status / agent_turn, overridable per test
e2e/live.spec.ts              # live journey, fallback, setup panel
docs/live-agent.md            # easy setup for whoever runs the app
```

**Structure Decision**: The CLI integration lives entirely in Rust (`src-tauri/src/agent/`) so the
webview never spawns processes and never sees paths or credentials; the frontend talks to it only
through two commands. Live state is part of the existing reducer so chapter jump, restart and
gating keep working in one place.

## Complexity Tracking

None.
