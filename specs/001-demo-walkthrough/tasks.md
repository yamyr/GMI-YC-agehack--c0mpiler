---

description: "Task list for the Agely demo walkthrough (Margaret meets Dev)"
---

# Tasks: Demo Walkthrough — Margaret meets Dev

**Input**: Design documents from `/specs/001-demo-walkthrough/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. Constitution Principle IV (test-first, non-negotiable). Vitest tests for pure
logic are written first and must fail before implementation; each story has a Playwright journey.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on
its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3 from spec.md
- Paths are relative to the repository root (single project, see plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folders, styles and test configuration the feature needs.

- [X] T001 Create the folder layout from plan.md: `src/demo/{domain,script,services,state,chrome,screens}/`
- [X] T002 [P] Create `src/demo/demo.css` importing nothing but using only `src/ui/tokens.css` variables; define layout classes `.demo`, `.demo-stage`, `.demo-card`, `.demo-label`, `.persona-banner`, `.chapter-list`, `.conversation`, `.turn`, `.turn--agent`, `.turn--person`, `.demo-nav`, `.field-error`; at 960×640 nothing may overflow horizontally
- [X] T003 [P] Add a Playwright project `min-960x640` (viewport 960×640) next to `desktop-1440x900` in `playwright.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entities, money/price rules, the step machine, navigation and the demo chrome. No
user story can start before this phase is done.

### Tests first (must fail before implementation)

- [X] T004 [P] Write `src/demo/domain/price.test.ts`: `validateRange` accepts integers ≥ 1 with "min ≤ max"; rejects min > max, 0, negatives, non-integers, NaN, each with a plain-language message; `overlap({60,90},{50,100})` = `{60,90}`; `overlap({40,60},{70,80})` = `null`; touching ranges `{50,60}`/`{60,70}` overlap at `{60,60}`; `contains(range, n)` inclusive
- [X] T005 [P] Write `src/demo/state/reducer.test.ts` (foundation part): initial state is step 1 `start`; `next` moves forward only when `canAdvance`; `back` from step 1 is a no-op; `back` keeps later state; `restart` from any step deep-equals `initialState(now)`; `showNextTurn` stops at `turns.length`; `canAdvance` on a conversation step is false until all turns are shown; `stepInfo` reports "step N of 13" and the current chapter and persona

### Implementation

- [X] T006 [P] Define all entity types from data-model.md in `src/demo/domain/types.ts` (Persona, Expert, Competency with `source` union, ConversationTurn, Conversation with "0 ≤ shown ≤ turns.length", PriceRange, PriceSuggestion, Brief, MatchResult, Proposal, Session, PaymentHold, Workflow, Engine)
- [X] T007 [P] Implement `formatUsd(n)` (e.g. "$75", "$1,050") in `src/demo/domain/money.ts`
- [X] T008 Implement `validateRange`, `overlap`, `contains` in `src/demo/domain/price.ts` so T004 passes
- [X] T009 Define `STEPS` (13 entries: id, chapter, persona, title) and `CHAPTERS` (Margaret onboards, Price, Dev's brief, Match, Book & pay, Debrief, Engine) in `src/demo/state/steps.ts`, exactly as in contracts/demo-actions.md
- [X] T010 Implement `DemoState`, `initialState(now: Date)`, `DemoAction` union (all actions from contracts/demo-actions.md, story-specific ones as no-ops for now), `canAdvance`, `stepInfo`, and navigation (`next`, `back`, `restart`, `showNextTurn`) in `src/demo/state/reducer.ts`, exported as `createReducer(services: DemoServices)` (services interfaces stubbed until T044) so T005 passes
- [X] T011 Implement `jumpTo(chapter)` in `src/demo/state/reducer.ts` using a per-step `fillDefaults` registry (initially identity for every step); add a test in `src/demo/state/reducer.test.ts` that jumping to each chapter lands on that chapter's first step
- [X] T012 [P] Build `src/demo/chrome/Conversation.tsx`: renders `turns.slice(0, shown)` with speaker names, `aria-live="polite"`, a "Next line" button (56px) disabled when all turns are shown, and the caption "This conversation stands in for a voice interview." (FR-005)
- [X] T013 [P] Build `src/demo/chrome/PersonaBanner.tsx`: "Now: Margaret, the expert" / "Now: Dev, the buyer" / "Margaret and Dev" with the persona name in text (never colour only)
- [X] T014 Build `src/demo/chrome/DemoChrome.tsx`: persistent "Demo — scripted data" label (FR-002), "Step N of 13 · {chapter}" (FR-004), chapter list as buttons dispatching `jumpTo` with `aria-current` on the active chapter (FR-004a), Back / Next / Restart buttons (FR-003) with Next disabled and a short reason when `canAdvance` is false
- [X] T015 Build `src/demo/screens/StartScreen.tsx`: introduces Margaret (retired procurement director) and Dev (hardware founder), states "All data is scripted. No agents, payments or calendars are connected." (FR-001), and a "Start the walkthrough" button
- [X] T016 Build `src/demo/DemoApp.tsx` hosting `useReducer(createReducer(scriptedServices), new Date(), initialState)`, rendering chrome + the screen for the current step (placeholder screen for steps not built yet); replace the body of `src/App.tsx` with `<DemoApp/>` while keeping the version footer; import `src/demo/demo.css`
- [X] T017 Update `e2e/smoke.spec.ts` for the new start screen (heading, demo disclaimer, version footer still shown) and keep the Tauri-bridge test

**Checkpoint**: The app opens on the start screen; Back/Next/Restart and the chapter list work on placeholder steps; `bun run test` and `bun run e2e` pass.

---

## Phase 3: User Story 1 — Margaret becomes an expert by talking (Priority: P1) 🎯 MVP

**Goal**: Interview → drafted profile with sources → edit → publish → suggested price with reasons → confirm her own range.

**Independent Test**: Start the demo, play the interview to the end, rename one competency, publish, change and confirm the price; the published profile card shows the edit and the price.

### Tests first

- [X] T018 [P] [US1] Add US1 cases to `src/demo/state/reducer.test.ts`: `replyToAgent` with each scripted profile/price reply has the same effect as the equivalent typed action (invariant 9); `editCompetency` with an empty/whitespace label is rejected with a message; any competency change after publishing sets `published = false` and any price change after confirming clears the confirmed price (invariant 6); `removeCompetency` below 3 blocks `publishProfile` ("3–5 when published"); `publishProfile` is the only action that sets `published`; `next` never publishes; `redoInterview` returns to step 2 with `shown = 0` and the profile unpublished; `setPrice` with min > max stores an error and `confirmPrice` is rejected; `confirmPrice` with a valid range sets Margaret's `priceRange`; `fillDefaults` for steps 2–4 yields a published profile with $60–$90
- [X] T019 [P] [US1] Write `e2e/walkthrough.spec.ts` › "Margaret onboards and prices": click through the interview, see "Draft — not published" and a source for each competency, pick the suggested reply that renames the first competency, publish, see the published card with the new name and "Credentials are self-declared", pick the reply "I'd rather charge $65–$95", confirm; separately use the typed alternative to rename a competency

### Implementation

- [X] T020 [P] [US1] Write `src/demo/script/margaret.ts`: 8–10 interview turns (agent asks about career, biggest supplier crisis, documents; Margaret answers and mentions "my CV and a supplier-audit checklist"), drafted Expert per data-model.md seed values (Margaret Okafor, 68, Columbus, Ohio, 34 years; 4 competencies incl. tag `contract-manufacturing`, each with an interview-turn or document source; 3 example problems), and `PriceSuggestion` $60–$90 with ≥ 2 reasons; suggested replies for the profile step ("Call the first one 'Contract manufacturing negotiation'", "Remove 'Cost-down programmes'", "That looks right") and the price step ("That sounds right", "I'd rather charge $65–$95"), each with the effect it applies
- [X] T021 [US1] Implement US1 actions in `src/demo/state/reducer.ts` (`replyToAgent`, `editCompetency`, `removeCompetency`, `redoInterview`, `publishProfile`, `setPrice`, `confirmPrice`, and back-to-draft on any change after publishing), gating for steps 2–4, and `fillDefaults` for steps 2–4 so T018 passes
- [X] T022 [US1] Build `src/demo/screens/InterviewScreen.tsx` (generic over a conversation id) using `Conversation`
- [X] T023 [US1] Build `src/demo/screens/ProfileScreen.tsx`: "Draft — not published" badge until published; headline, years, location; each competency with its source ("From the interview" / "From: Supplier audit checklist.pdf"); the agent asks "Anything you'd like to change before I publish?" with suggested-reply buttons (primary) and, as a secondary "Or type the change yourself" disclosure, inline Change (text input, Save/Cancel) and Remove per competency; "Publish my profile" and "Start the interview again"; after publishing shows the published card and "Credentials are self-declared"
- [X] T024 [US1] Build `src/demo/screens/PriceScreen.tsx`: agent suggestion with reasons; suggested replies "That sounds right" and "I'd rather charge $65–$95" (primary); secondary "Or type your own range" disclosure with two labelled whole-dollar inputs per 15 minutes; validation message from `validateRange` shown in text with `role="alert"`; "Confirm my price"
- [X] T025 [US1] Wire steps 2–4 to their screens in `src/demo/DemoApp.tsx` and make T019 pass

**Checkpoint**: US1 runs end to end and is demoable on its own.

---

## Phase 4: User Story 2 — Dev gets a brief and a match he understands (Priority: P2)

**Goal**: Dev's conversation → drafted brief → confirm → match with explanation (or an honest no-match).

**Independent Test**: Jump to "Dev's brief" (Margaret pre-seeded by defaults), confirm the brief, see Margaret matched with the competency and the $60–$90 overlap, and see why Harold and Lin were not matched.

### Tests first

- [X] T026 [P] [US2] Write `src/demo/domain/advice.test.ts`: detects legal ("legal advice", "lawyer", "lawsuit", "sue"), medical ("diagnose", "medication", "symptom", "treatment") and financial ("investment advice", "which stocks", "tax advice", "retirement savings") requests case-insensitively, returns the category; Dev's scripted brief problem returns `null`
- [X] T027 [P] [US2] Write `src/demo/domain/match.test.ts`: Margaret matches Dev's brief with overlap $60–$90 and the `contract-manufacturing` competency; Harold excluded for "competency", Lin for "price", an unpublished expert for "unpublished"; ranking by overlap width then years; no expert with the tag → `{kind: "none", reason: "competency"}`; tag present but no overlap → `reason: "price"`; explanation lines name the competency and the overlap in dollars
- [X] T028 [P] [US2] Add US2 cases to `src/demo/state/reducer.test.ts`: `editBrief` updates the draft; `confirmBrief` rejected for empty problem, invalid budget, or restricted advice (message names the category and says Agely doesn't offer it); `confirmBrief` is the only way to set `confirmed`; step 7 `canAdvance` only on a `match`; removing Margaret's `contract-manufacturing` competency (via `back`) yields a no-match whose reason is "price" (Lin still has the competency but charges $120–$160); `fillDefaults` for steps 5–6 confirms the scripted brief
- [X] T029 [P] [US2] Add `e2e/walkthrough.spec.ts` › "Dev's brief and match": jump to "Dev's brief", see "Now: Dev, the buyer", play the conversation, confirm the brief (2 × 15 min, $50–$100), see Margaret matched with "$60–$90" overlap and reasons, and the not-matched list for Harold and Lin

### Implementation

- [X] T030 [P] [US2] Write `src/demo/script/dev.ts`: 6–8 turns (Dev explains the first contract-manufacturing agreement, MOQ and tooling worries; agent asks budget and timing) and the drafted Brief (problem "Review the commercial terms of my first contract-manufacturing agreement before I sign", tag `contract-manufacturing`, units 2, budget $50–$100) plus the agent note "Agely does not give legal advice; for legal review, use a lawyer."
- [X] T031 [P] [US2] Write `src/demo/script/experts.ts`: Harold Brooks (hospital operations, $40–$60, no matching tag) and Lin Zhao (retired supply-chain VP, `contract-manufacturing`, $120–$160), both published
- [X] T032 [P] [US2] Implement `detectRestrictedAdvice(text)` in `src/demo/domain/advice.ts` so T026 passes
- [X] T033 [US2] Implement `matchBrief(brief, experts)` in `src/demo/domain/match.ts` so T027 passes
- [X] T034 [US2] Implement US2 actions and gating (`editBrief`, `confirmBrief`, derived `match` from current Margaret + seeded experts) and `fillDefaults` for steps 5–6 in `src/demo/state/reducer.ts` so T028 passes
- [X] T035 [US2] Build `src/demo/screens/BriefScreen.tsx`: draft badge, problem (editable text), competency, length "30 minutes (2 × 15 min)", budget (two whole-dollar inputs), the no-legal-advice note, "Confirm my brief", errors with `role="alert"`
- [X] T036 [US2] Build `src/demo/screens/MatchScreen.tsx`: match card (name, headline, years, matched competency, "Price overlap: $60–$90 per 15 min", explanation bullets) and "Why not the others" list; no-match state with the reason text
- [X] T037 [US2] Wire steps 5–7 in `src/demo/DemoApp.tsx` and make T029 pass

**Checkpoint**: US1 and US2 both work; jumping to "Dev's brief" works without clicking through US1.

---

## Phase 5: User Story 3 — Book, pay, meet, and the engine grows (Priority: P3)

**Goal**: Proposal inside the overlap → Margaret accepts → confirmed session with held payment → mark held → released → debrief → approve workflow → engine.

**Independent Test**: Jump to "Book & pay", send 2 × $75, accept, mark held, play the debrief, approve the workflow; the engine shows 1 workflow, 1 session, $150.

### Tests first

- [X] T038 [P] [US3] Write `src/demo/domain/proposal.test.ts`: total = units × price; price outside the overlap is flagged with a message naming the overlap; non-integer or < 1 price rejected
- [X] T039 [P] [US3] Write `src/demo/services/scripted.test.ts`: `hold(150)` → `{status:"held", amount:150, demo:true}`; `hold(0)`/`hold(1.5)` throw; `release` of held → released; `release` of a non-held hold throws; `createLink("s1")` → `https://meet.example.com/agely-demo-s1`, "Google Meet", `isDemo: true`
- [X] T040 [P] [US3] Write `src/demo/state/dates.test.ts`: with now = 2026-11-11T15:00 local, the session starts 2026-11-13T10:00 local; formatting gives a readable weekday/date/time
- [X] T041 [P] [US3] Add US3 cases to `src/demo/state/reducer.test.ts`: `sendProposal` outside overlap rejected; `acceptProposal` creates a session with payment "held" and a demo link; `declineProposal` holds nothing, returns to step 8 with a message for Dev; `markSessionHeld` releases payment; only `approveWorkflow` approves; engine derives 1 workflow / 1 session / $150; `jumpTo("Engine")` deep-equals the clicked-through happy path (invariant 8); no action except the named ones sets publish/confirm/accept/held/approve flags (invariant 1)
- [X] T042 [P] [US3] Add `e2e/walkthrough.spec.ts` › "Book, pay, debrief, engine": jump to "Book & pay", try $95 and see the warning, send $75, banner switches to Margaret, accept, see date, "$150", demo link label and "Payment held until the session takes place", mark held → "Released to Margaret", play the debrief, see "Proposed" workflow, approve, engine shows the workflow, "1 session" and "$150 earned"

### Implementation

- [X] T043 [P] [US3] Implement `validateProposal` and `proposalTotal` in `src/demo/domain/proposal.ts` so T038 passes
- [X] T044 [P] [US3] Define `PaymentService`, `MeetingService`, `PaymentHold`, `MeetingLink` in `src/demo/services/types.ts` and scripted implementations in `src/demo/services/scripted.ts` per contracts/services.md so T039 passes
- [X] T045 [P] [US3] Implement `sessionStart(now)` and `formatSessionTime(date)` in `src/demo/state/dates.ts` so T040 passes
- [X] T046 [P] [US3] Write `src/demo/script/debrief.ts`: 6–8 debrief turns and the proposed Workflow "First read of a contract-manufacturing agreement" with questions (MOQ, tooling ownership, payment terms), checks (AQL/acceptance criteria, price-escalation clause, IP and tooling transfer), watch-outs (unbounded MOQ, tooling held hostage, vague acceptance)
- [X] T047 [US3] Implement US3 actions (`setProposalUnits`, `setProposalPrice`, `sendProposal`, `acceptProposal`, `declineProposal`, `markSessionHeld`, `approveWorkflow`), gating and `fillDefaults` for steps 8–12 in `src/demo/state/reducer.ts` (services injected via the reducer factory so tests can pass scripted ones) so T041 passes
- [X] T048 [US3] Build `src/demo/screens/ProposalScreen.tsx` (Dev: length, price per 15 min within "$60–$90", live total, warning when outside, "Send proposal to Margaret", declined message if any)
- [X] T049 [US3] Build `src/demo/screens/AcceptScreen.tsx` (Margaret: proposal summary, "Accept" / "Decline", note that nothing is booked or charged until she accepts)
- [X] T050 [US3] Build `src/demo/screens/SessionScreen.tsx` (date/time, 30 minutes, $150, call link labelled "Demo link — not a real meeting", payment status text "Payment held until the session takes place" → "Released to Margaret", "Mark the session as held")
- [X] T051 [US3] Build `src/demo/screens/WorkflowScreen.tsx` ("Proposed" badge, questions/checks/watch-outs lists, "Approve for my engine") and `src/demo/screens/EngineScreen.tsx` (approved workflows, sessions completed, earnings to date, "Today / Next / Then / Later" roadmap lines from the brief)
- [X] T052 [US3] Wire steps 8–13 in `src/demo/DemoApp.tsx` and make T042 pass

**Checkpoint**: The full walkthrough runs from start to engine.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T053 [P] Write `e2e/navigation.spec.ts`: chapter jump to Match then Engine, Back keeps state, Restart from the engine returns to the start screen in one action (SC-002)
- [X] T054 [P] Write `e2e/edgecases.spec.ts`: price min > max explanation; brief with "I need legal advice about suing my supplier" is declined with the explanation; Margaret declines and Dev sees the message and can propose again; proposal at $95 flagged
- [X] T055 [P] Write `e2e/layout.spec.ts`: for every chapter at the `min-960x640` project, `document.documentElement.scrollWidth <= innerWidth`, the demo label is visible, the primary action is reachable; no visible text has a computed font size below 16px (FR-026); record any network request whose URL is not the dev server and assert none (SC-005)
- [X] T056 [P] Keyboard pass: every action reachable by Tab with visible focus; fix any gaps in `src/demo/demo.css`
- [X] T057 Update `README.md` with a "Run the demo" section pointing to `specs/001-demo-walkthrough/quickstart.md`
- [X] T058 Run the full quickstart gate (tsc, Vitest, build, e2e, cargo fmt/clippy/test) and `bun run tauri dev` dry run; fix anything that fails

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T017) → US1 → US2 → US3 → Polish.
- US2 depends on Foundational and uses Margaret's script (T020) for the match; it is testable on
  its own through chapter jump. US3 depends on US2's match result.
- Within each story: tests → script/domain → reducer → screens → wiring.
- `src/demo/state/reducer.ts` and `src/demo/DemoApp.tsx` are shared files: tasks touching them are
  never marked [P].

## Parallel Examples

- Foundational: T004, T005, T006, T007 together; then T012, T013 alongside T010.
- US1: T018, T019, T020 together.
- US2: T026, T027, T028, T029, T030, T031 together; then T032 with T033.
- US3: T038–T046 together (different files); then T047 → T048–T051 → T052.
- Polish: T053–T056 together.

## Implementation Strategy

- **MVP**: Phases 1–3 (US1). Demoable: Margaret onboards by talking and sets her price.
- **Increment 2**: add US2 for the two-sided story and the match explanation.
- **Increment 3**: add US3 for book/pay/debrief/engine, the full pitch.
- Commit after each phase checkpoint; the PR merges once the Phase 6 gate is green.
