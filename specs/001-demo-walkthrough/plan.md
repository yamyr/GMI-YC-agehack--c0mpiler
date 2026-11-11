# Implementation Plan: Demo Walkthrough — Margaret meets Dev

**Branch**: `feat/demo-flow` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-demo-walkthrough/spec.md`

## Summary

Build a presenter-driven, fully offline walkthrough inside the Agely desktop app that tells one
story in 13 steps across 7 chapters: Margaret's scripted interview → profile review and publish →
price → Dev's brief conversation → brief confirmation → match with explanation → proposal →
Margaret accepts → session confirmed (payment held → released) → debrief → workflow approval →
engine. The whole flow is a pure TypeScript state machine (`useReducer`) over scripted data, with
the real business rules (price-range validation and overlap, competency + price matching, a
restricted-advice guard, proposal pricing) as tested pure functions. Payments and meeting links go
through small service interfaces with scripted implementations, so real Stripe / Meet adapters can
replace them later. No Rust, backend or network changes.

## Technical Context

**Language/Version**: TypeScript 5.8 (strict), React 19; Rust 1.99 shell unchanged

**Primary Dependencies**: React, Vite 7, Tauri 2 (existing). No new runtime dependencies.

**Storage**: None — in-memory state only; nothing survives a restart (spec Assumptions)

**Testing**: Vitest (domain + reducer unit tests), Playwright against the Vite dev server with
the Tauri IPC stub (journeys, chapter jump, layout at minimum window size, offline check)

**Target Platform**: Tauri 2 desktop (macOS first); also runs in a browser under `bun run dev`

**Project Type**: desktop-app (single frontend project + thin Rust shell)

**Performance Goals**: every presenter action updates the screen with no perceptible delay
(< 100 ms); full walkthrough runnable in < 7 minutes (SC-001)

**Constraints**: offline (zero network requests beyond the local dev server, SC-005); usable at the
minimum window size 960×640 with no clipped text or horizontal scroll (SC-004); 16px type floor,
56px controls, keyboard reachable (FR-026)

**Scale/Scope**: 1 presenter, 2 personas, 3 seeded experts, 13 steps, 7 chapters

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies | Status |
|-----------|------------------------|--------|
| I. Older Adults First | Expert-side profile creation is a conversation; Margaret changes her profile and price by replying to the agent (suggested replies), with typing only as a secondary alternative, never a blank form. Uses `tokens.css` sizes (16px floor, 56px controls); focus rings; status text always paired with a word, never colour only. Min-size e2e check. | PASS |
| II. People Decide, Agents Propose | Reducer enforces that `publish`, `confirmPrice`, `confirmBrief`, `propose`, `accept`, `markHeld`, `approveWorkflow` happen only via explicit actions; Next is gated on them. Agent suggestions show reasons and are editable. Unit tests assert no transition skips a human action (except chapter-jump defaults, which are presenter actions — see below). | PASS |
| III. Honest by Default | Persistent "Demo — scripted data" label; start screen disclaimer; call link and payment status labelled "demo"; services behind interfaces; restricted-advice guard; "self-declared" label on credentials. | PASS |
| IV. Test-First | Domain functions and reducer get failing Vitest tests first; Playwright journeys for each user story; full CI gate before done. | PASS |
| V. Simple Until Proven Otherwise | No new dependencies, no backend, no persistence; pure functions + `useReducer`; tokens only. | PASS |

Chapter jump (FR-004a) fills earlier steps with scripted defaults. This is a presenter action that
replays the scripted human decisions; it is not an agent acting for a person, so Principle II holds.

**Post-design re-check (after Phase 1)**: PASS — data model and contracts introduce no new
dependencies, services stay behind interfaces, every state transition that publishes, books or
pays is a named human action.

## Project Structure

### Documentation (this feature)

```text
specs/001-demo-walkthrough/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── demo-actions.md  # Reducer action/step contract (UI ↔ state)
│   └── services.md      # Payment & meeting service interfaces
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── App.tsx                      # renders <DemoApp/> + version footer
└── demo/
    ├── DemoApp.tsx              # useReducer host, chrome + current screen
    ├── demo.css                 # demo-only styles (tokens only)
    ├── domain/
    │   ├── types.ts             # entities from data-model.md
    │   ├── money.ts             # USD formatting
    │   ├── price.ts (+ .test)   # validateRange, overlap, contains
    │   ├── match.ts (+ .test)   # matchBrief → match | no-match reason
    │   ├── advice.ts (+ .test)  # restricted-advice guard
    │   └── proposal.ts (+ .test)# proposal validation and total
    ├── script/
    │   ├── margaret.ts          # interview turns, drafted profile, price suggestion
    │   ├── dev.ts               # brief conversation, drafted brief
    │   ├── experts.ts           # seeded other experts
    │   └── debrief.ts           # debrief turns, proposed workflow
    ├── services/
    │   ├── types.ts             # PaymentService, MeetingService
    │   └── scripted.ts (+ .test)# offline demo implementations
    ├── state/
    │   ├── steps.ts             # ordered steps, chapters, personas
    │   ├── reducer.ts (+ .test) # DemoState, DemoAction, gating, jump
    │   └── dates.ts (+ .test)   # session time relative to today
    ├── chrome/
    │   ├── DemoChrome.tsx       # demo label, step counter, chapters, back/next/restart
    │   ├── PersonaBanner.tsx    # "Now: Dev, the buyer"
    │   └── Conversation.tsx     # turn-by-turn transcript
    └── screens/
        ├── StartScreen.tsx
        ├── InterviewScreen.tsx  # used for Margaret, Dev and debrief conversations
        ├── ProfileScreen.tsx
        ├── PriceScreen.tsx
        ├── BriefScreen.tsx
        ├── MatchScreen.tsx
        ├── ProposalScreen.tsx
        ├── AcceptScreen.tsx
        ├── SessionScreen.tsx
        ├── WorkflowScreen.tsx
        └── EngineScreen.tsx

e2e/
├── smoke.spec.ts                # updated for the new start screen
├── walkthrough.spec.ts          # US1–US3 journey end to end
├── navigation.spec.ts           # back, restart, chapter jump
├── edgecases.spec.ts            # bad price range, restricted advice, decline, out-of-overlap proposal
└── layout.spec.ts               # every step at 960×640: no horizontal scroll, demo label visible; offline
```

**Structure Decision**: Single frontend project. All feature code lives under `src/demo/` so the
demo can later be swapped for the real product shell without touching foundation code. Pure logic
(`domain/`, `state/`, `services/scripted.ts`) is unit-tested with Vitest; screens are covered by
Playwright. `src-tauri/` is unchanged.

## Complexity Tracking

No constitution violations to justify.
