---

description: "Task list for the live agent via the local Codex CLI"
---

# Tasks: Live Agent via the Local Codex CLI

**Input**: `/specs/002-live-codex-agent/` (plan, spec, research, data-model, contracts, quickstart)

**Tests**: REQUIRED (constitution Principle IV). Rust and Vitest tests first; Playwright via the stub.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Create `src-tauri/src/agent/` (mod, locate, prompt, output, status, run) and `src/demo/live/` per plan.md
- [X] T002 [P] Add canned `agent_status` (default `{state:"not_installed", …}`) and `agent_turn` to `e2e/tauriStub.ts`, with per-test overrides via `installTauriStub(page, overrides)`

---

## Phase 2: Foundational (Rust agent core + frontend live state)

### Tests first

- [X] T003 [P] `src-tauri/src/agent/output.rs` tests: valid JSON → AgentTurn; options ≠ 3, empty or > 160 chars, empty message or > 600 chars → `malformed`; non-JSON → `malformed`; `done` forced true on the last allowed turn; `schema_json()` requires message/options(3)/done
- [X] T004 [P] `src-tauri/src/agent/prompt.rs` tests: prompt contains role, goal, background, "written as Margaret/Dev", the 160-char rule, the no legal/medical/financial rule, the never publish/book/accept/pay rule, the no-commands/no-files rule, the turn budget, and the transcript lines in order labelled by speaker
- [X] T005 [P] `src-tauri/src/agent/status.rs` tests: `login status` text classification (ChatGPT / API key → signed in; "Not logged in" / non-zero → not_signed_in); probe stderr containing "not supported when using Codex with a ChatGPT account" → model_unavailable; candidate list honours `AGELY_CODEX_MODEL`
- [X] T006 [P] `src-tauri/src/agent/locate.rs` tests: `AGELY_CODEX_BIN` wins; then PATH entries; then common dirs (`~/.npm-global/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`, `~/.bun/bin`, `~/.volta/bin`); missing → None (lookup takes an injected "exists" fn)
- [X] T007 [P] `src/demo/live/state.test.ts`: request sets pending with a fresh id; receive with matching id appends agent line + options, clears pending, sets ended on done; receive with stale id ignored; fail sets error and clears pending; reply rejects empty text, appends person line, requests next; finish requires ≥ 1 person line; useScripted switches mode and clears pending/error
- [X] T008 [P] `src/demo/live/client.test.ts`: outside Tauri `getAgentStatus()` returns `unavailable` and `runAgentTurn` rejects `not_ready`; inside Tauri it invokes `agent_status` / `agent_turn` with the contract shapes

### Implementation

- [X] T009 Implement `output.rs`, `prompt.rs`, `status.rs`, `locate.rs` so T003–T006 pass
- [X] T010 Implement `run.rs`: spawn codex with the contract args, `Stdio::null()` stdin, empty temp dir as `-C`, poll `try_wait` with 60 s timeout then kill, read `out.json`, remove temp dir
- [X] T011 Implement `agent/mod.rs`: `AgentState` (Mutex<Option<AgentStatus>>), `agent_status(recheck)` and `agent_turn(request)` as async commands using `spawn_blocking`; register in `src-tauri/src/lib.rs`
- [X] T012 [P] Implement `src/demo/live/types.ts` and `client.ts` so T008 passes
- [X] T013 Implement `src/demo/live/state.ts` so T007 passes

**Checkpoint**: `cargo test` and `bun run test` green; commands callable.

---

## Phase 3: User Story 1 — Live onboarding interview (P1) 🎯 MVP

- [X] T014 [P] [US1] Add reducer tests in `src/demo/state/reducer.test.ts`: `setLiveEnabled`; on a live conversation step `canAdvance` is true only when the live conversation has ended; `useScripted` falls back to scripted gating; restart resets live state; jumpTo puts earlier conversations in scripted mode; a stale `liveTurnReceived` is ignored
- [X] T015 [P] [US1] Write `e2e/live.spec.ts` › "live interview": stub ready + canned turns; start screen shows "Live agent: ready" and the model; interview shows the agent message labelled live, 3 options, a typed-reply box; picking an option shows Margaret's line and the next turn; "Finish conversation" enables Next; profile shows the scripted-draft note
- [X] T016 [US1] Write `src/demo/live/briefs.ts` (interview brief: onboarding agent, goal = career, proudest supplier fix, documents; background = Margaret facts; replyAs Margaret; maxTurns 5)
- [X] T017 [US1] Extend `DemoState` with `live` and add actions (`setLiveEnabled`, `liveRequest`, `liveTurnReceived`, `liveTurnFailed`, `liveReply`, `liveFinish`, `liveUseScripted`) in `src/demo/state/reducer.ts`; gating, restart and jump rules so T014 passes
- [X] T018 [US1] Implement `src/demo/live/useLiveRunner.ts`: when a live conversation step has no lines and no pending/error, request the opening turn; run each pending request once (ref-guarded for StrictMode); dispatch received/failed with its requestId
- [X] T019 [US1] Build `src/demo/live/LiveConversation.tsx`: transcript with "Live agent (Codex)" badge, thinking indicator (`aria-live`), 3 option buttons, typed reply + Send, Finish conversation (after ≥ 1 reply), error with Try again / Use the scripted conversation
- [X] T020 [US1] Build `src/demo/live/LiveAgentPanel.tsx` on the start screen: checking/ready/not-ready states, model, privacy note (FR-018), on/off toggle when ready, fix step + Check again
- [X] T021 [US1] Wire DemoApp: fetch status on mount (background), set `live.enabled` when ready (FR-002), run `useLiveRunner`; InterviewScreen renders LiveConversation when live; ProfileScreen shows "This is the scripted draft — drafting from the live interview comes later." after a live interview; make T015 pass

---

## Phase 4: User Story 2 — Live brief chat and debrief (P2)

- [X] T022 [P] [US2] Add briefs for `brief` (buyer's agent, goal = problem, worries, length, budget; replyAs Dev) and `debrief` (Agely agent, goal = how Margaret reviews a CM agreement: first questions, checks, watch-outs; replyAs Margaret) in `src/demo/live/briefs.ts`
- [X] T023 [P] [US2] Extend `e2e/live.spec.ts` › "live brief and debrief": jump to Dev's brief → Dev banner + live turn; jump to Debrief → live turn; BriefScreen and WorkflowScreen show the scripted-draft note after a live chat
- [X] T024 [US2] Scripted-draft notes on `BriefScreen.tsx` and `WorkflowScreen.tsx`; make T023 pass

---

## Phase 5: User Story 3 — Easy setup and graceful fallback (P3)

- [X] T025 [P] [US3] Extend `e2e/live.spec.ts` › "setup and fallback": status not_installed → scripted interview + install step shown; not_signed_in → `codex login` shown; Check again with a now-ready stub flips to ready; a failing `agent_turn` → error with Try again (succeeds on retry) and Use the scripted conversation (scripted lines + Next works); toggle off → scripted
- [X] T026 [US3] Write `docs/live-agent.md`: what it is, 3-step setup (install, `codex login`, run), model selection (`AGELY_CODEX_MODEL`), binary override (`AGELY_CODEX_BIN`), privacy, troubleshooting table (each status), how to turn it off
- [X] T027 [US3] Link the setup doc from `README.md`; make T025 pass

---

## Phase 6: Polish

- [X] T028 [P] Layout spec covers the live interview at 960×640 (no overflow, 16px floor) in `e2e/layout.spec.ts`
- [ ] T029 Manual quickstart run with real Codex (steps 1–4); record timings in the PR
- [X] T030 Full gate: tsc, Vitest, build, Playwright, cargo fmt/clippy/test

## Dependencies

Setup → Foundational → US1 → US2 → US3 → Polish. `reducer.ts`, `DemoApp.tsx`, `briefs.ts` and
`e2e/live.spec.ts` are shared files (not [P] with each other's edits).

## Implementation Strategy

MVP = US1 (live interview + readiness panel). US2 reuses the same machinery with new briefs. US3
hardens setup and fallback.
