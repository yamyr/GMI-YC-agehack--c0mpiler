# Research: Demo Walkthrough — Margaret meets Dev

No `NEEDS CLARIFICATION` items remained in the Technical Context; the spec's open questions were
resolved in `/speckit-clarify`. This file records the design decisions.

## R1. Flow state: pure reducer over an ordered step list

- **Decision**: One `DemoState` held by `useReducer`, driven by a typed `DemoAction` union and an
  ordered `STEPS` array (id, chapter, persona). `canAdvance(state)` gates Next on the step's
  required human action.
- **Rationale**: Fully unit-testable without rendering; back/restart/jump are trivial; enforces
  Principle II in one place.
- **Alternatives**: React Router (adds a dependency and URL state we don't need); XState (heavy for
  13 linear steps); per-screen local state (makes chapter jump and gating scattered).

## R2. Chapter jump fills defaults by replaying scripted actions

- **Decision**: Each step defines `fillDefaults(state)` that applies the scripted human decision
  (publish the drafted profile, keep the suggested price, confirm the brief, propose 2×$75,
  accept, mark held, approve). `jumpTo(chapter)` starts from the initial state and replays
  `fillDefaults` for every earlier step.
- **Rationale**: Deterministic; jumping always yields the same state as clicking through the happy
  path; one code path to test.
- **Alternatives**: Hand-written snapshot per chapter (drifts from the real flow).

## R3. Matching rule

- **Decision**: An expert qualifies when (a) the expert is published, (b) one of their competency
  tags equals the brief's required competency tag, and (c) their price range overlaps the brief's
  budget. Rank qualified experts by overlap width, then years of experience. If none qualify,
  report the reason: `competency` when no published expert has the tag, otherwise `price`.
- **Rationale**: Mirrors the product description ("matches on competency and on where the two
  price ranges overlap, and explains why"); simple enough to explain on stage.
- **Alternatives**: Weighted scoring / embeddings — not explainable in one sentence and no data.

## R4. Price ranges in whole dollars per 15 minutes

- **Decision**: Integer USD per 15-minute unit. Valid when both values are integers ≥ 1 and
  min ≤ max. Overlap = [max(minA, minB), min(maxA, maxB)] when non-empty.
- **Rationale**: Matches the spec; avoids float money bugs.

## R5. Restricted-advice guard

- **Decision**: Keyword/phrase detection on the brief's problem text for legal (e.g. "legal
  advice", "lawyer", "lawsuit", "sue"), medical ("diagnos", "medication", "symptom", "treatment")
  and financial advice ("investment advice", "which stocks", "tax advice", "retirement savings").
  A hit blocks brief confirmation and shows a plain explanation.
- **Rationale**: Deterministic and offline; enough for the scripted demo. A real classifier comes
  with the real buyer agent. Dev's scripted brief is commercial ("commercial terms") and is
  verified by a test not to trigger the guard.
- **Alternatives**: LLM classification — out of scope (no connected agents).

## R6. Services behind interfaces

- **Decision**: `PaymentService { hold(amountUsd) → PaymentHold; release(hold) → PaymentHold }`
  and `MeetingService { createLink(sessionId) → { url, provider, isDemo } }`, with scripted
  implementations that never touch the network and always set `isDemo: true` / `demo: true`.
- **Rationale**: Principle III (mocks replaceable by real adapters); keeps the demo honest.

## R7. Relative dates

- **Decision**: The session is scheduled two days after "today" at 10:00 local time; the reducer
  receives `now` from the host so tests can fix the clock.

## R8. Testing strategy without new dependencies

- **Decision**: Vitest for all pure logic; Playwright (existing) for UI journeys, chapter jump,
  min-size layout (960×640 project) and an offline assertion (fail on any request not to the dev
  server). No React Testing Library.
- **Rationale**: Principle V; the screens are thin views over tested state.

## R9. Conversation presentation

- **Decision**: Scripted turns revealed one at a time with a large "Next line" button; a caption
  says the conversation stands in for a voice interview (FR-005). Step Next unlocks when all turns
  are shown. `aria-live="polite"` announces each new turn.
