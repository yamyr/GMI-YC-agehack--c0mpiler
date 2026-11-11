# Data Model: Live Agent

Shapes cross the Tauri IPC boundary in camelCase (serde `rename_all = "camelCase"`).

## AgentStatus

| Field | Type | Notes |
|-------|------|-------|
| state | `"ready" \| "checking" \| "not_installed" \| "not_signed_in" \| "model_unavailable" \| "unavailable" \| "error"` | `checking` is frontend-only; `unavailable` = browser preview |
| model | string \| null | model in use when ready |
| detail | string | plain-language explanation |
| fix | string \| null | the next step, e.g. `codex login` |

## AgentBrief (per conversation, from `src/demo/live/briefs.ts`)

| Field | Type | Rules |
|-------|------|-------|
| conversation | `"interview" \| "brief" \| "debrief"` | |
| agentRole | string | e.g. "Agely onboarding agent" |
| goal | string | what the agent is trying to learn |
| background | string | scripted persona facts the agent may use |
| replyAs | `"Margaret" \| "Dev"` | voice of the suggested replies |
| maxTurns | number | 1–5 (FR-012) |

## TranscriptLine

`{ speaker: "agent" | "person"; text: string }`. Person text non-empty after trim (FR-010).

## AgentTurn (result of `agent_turn`)

`{ message: string; options: [string, string, string]; done: boolean }`.
- `message` non-empty, ≤ 600 chars.
- exactly 3 options, each non-empty and ≤ 160 chars (FR-009); otherwise the turn is `malformed`.
- `done` forced to `true` when `agentTurnsSoFar + 1 >= maxTurns`.

## AgentError

`{ code: "not_ready" | "timeout" | "failed" | "malformed"; message: string }`.

## LiveConversation (frontend state, per conversation id)

| Field | Type | Notes |
|-------|------|-------|
| mode | `"live" \| "scripted"` | `scripted` after "Use the scripted conversation" or when live is off |
| lines | `TranscriptLine[]` | ordered |
| options | `string[]` | options from the latest agent turn |
| pending | `{ requestId: number } \| null` | a turn is being generated |
| ended | boolean | agent said done, max turns reached, or presenter finished |
| error | string \| null | last failure |

Transitions: `request → (receive | fail)`; `receive` with a stale id is ignored; `reply` appends a
person line and requests the next turn; `finish` requires ≥ 1 person line; `useScripted` sets
mode `scripted` and clears pending/error.

## DemoState additions

`live: { enabled: boolean; nextRequestId: number; conversations: Record<ConversationId, LiveConversation> }`.
`enabled` is set from readiness + the presenter toggle. `restart` and `jumpTo` reset all live
conversations (jump puts earlier conversation steps in `scripted` mode with scripted lines revealed).
