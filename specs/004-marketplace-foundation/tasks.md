# Tasks: Marketplace Foundation

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/)

Tests come first (constitution principle IV): each test task is written and seen failing before
the task that makes it pass. `[P]` marks tasks that touch different files and can run in parallel.

## Phase 1: Setup

- [ ] T001 Create `src/product/` folders (`model`, `ports`, `ports/contract`, `standins`, `usecases`, `calendar`, `screens`) and `src/product/copy.ts` with the stand-in labels (FR-022, FR-027).
- [ ] T002 Route `#/app` to a placeholder `ProductApp` from `src/main.tsx`, leaving the walkthrough the default; hide the entry inside Tauri (FR-023, FR-025). Add `site/_redirects` for `/app`.

## Phase 2: Foundation (blocks every story)

- [ ] T003 [P] Model types, ids and cents helpers with unit tests in `src/product/model/` (data-model.md; FR-020).
- [ ] T004 [P] Skill catalogue and keyword lookup with unit tests in `src/product/model/catalogue.ts` (R6).
- [ ] T005 [P] Port interfaces and `ServiceStatus` in `src/product/ports/` (contracts/ports.md).
- [ ] T006 [P] `StorePort` contract suite in `src/product/ports/contract/store.ts`, then the stand-in in `src/product/standins/store.ts` over a key-value interface (R3; FR-008).
- [ ] T007 [P] `AuthPort` contract suite, then the stand-in with on-screen codes, expiry and single use (R4; FR-001).
- [ ] T008 [P] `PaymentsPort` contract suite, then the stand-in with idempotent holds and a decline switch (R8; FR-015, FR-016).
- [ ] T009 [P] `MeetingsPort` contract suite, then the stand-in with stable placeholder links (FR-017).
- [ ] T010 [P] `AgentPort` contract suite, then the rule-based stand-in for profile, price and brief drafts (R5).
- [ ] T011 Use-case context (`ports`, `now`, acting account) and the shared `not-signed-in` and `not-yours` checks with tests in `src/product/usecases/context.ts` (R7, R11; FR-004).
- [ ] T012 Product shell: service-status banner, try-out notice, role indicator, sign-out, in `src/product/ProductApp.tsx`, using `src/ui/tokens.css` (FR-002, FR-022, FR-024, FR-027).

**Checkpoint**: every stand-in passes its contract suite; `#/app` renders the shell.

## Phase 3: User Story 1 - An expert's profile is kept (P1)

**Independent test**: create an expert, publish with a price, start a new session, find it unchanged.

- [ ] T013 [P] [US1] Use-case tests for `addRole`, `saveProfileDraft`, `publishProfile`, `unpublishProfile`, `confirmPrice`, including not-owner refusals (contracts/use-cases.md).
- [ ] T014 [US1] Implement those use cases in `src/product/usecases/profile.ts` (FR-005, FR-006).
- [ ] T015 [P] [US1] Playwright journey `e2e/product-expert.spec.ts`: sign in with a stand-in code, interview, edit a skill, publish, confirm a price, reload, sign in again, unpublish and republish.
- [ ] T016 [US1] Sign-in screens (request code, confirm code) in `src/product/screens/` (FR-001).
- [ ] T017 [US1] Interview, profile and price screens for a real expert, reusing the walkthrough's conversation and card styles (FR-005, FR-006; principle I).
- [ ] T018 [US1] Expert home and account screens, with roles, sign-out and account deletion (FR-002, FR-003).

**Checkpoint**: story 1 passes on its own.

## Phase 4: User Story 2 - A buyer is matched with real experts (P2)

**Independent test**: three stored experts (fit, no skill, price gap); a confirmed brief shows the fit and both reasons.

- [ ] T019 [P] [US2] Use-case tests for `saveBriefDraft`, `confirmBrief` (including regulated advice), `runMatch` (only matchable profiles, stale detection).
- [ ] T020 [US2] Implement in `src/product/usecases/brief.ts` and `match.ts`, calling `matchBrief` from `src/demo/domain/match.ts` unchanged (FR-007, FR-009 to FR-012).
- [ ] T021 [P] [US2] Playwright journey `e2e/product-buyer.spec.ts` seeded with three experts, covering match, no-match by skill, no-match by price and a stale match.
- [ ] T022 [US2] Buyer home, brief conversation and brief review screens (FR-007).
- [ ] T023 [US2] Match screen with reasons and the experts not chosen (FR-011).

**Checkpoint**: stories 1 and 2 pass independently.

## Phase 5: User Story 3 - A session is booked and the payment is held (P3)

**Independent test**: a proposal accepted once holds one payment and yields a session with a link; a decline holds nothing.

- [ ] T024 [P] [US3] Use-case tests for `sendProposal`, `withdrawProposal`, `acceptProposal`, `declineProposal`: range checks, double accept, failed hold, overlapping proposals, wrong expert.
- [ ] T025 [US3] Implement in `src/product/usecases/booking.ts`, with acceptance as one transaction (FR-013 to FR-016).
- [ ] T026 [P] [US3] `.ics` generation with unit tests in `src/product/calendar/ics.ts` (R10; FR-017).
- [ ] T027 [P] [US3] Playwright journey `e2e/product-booking.spec.ts`: propose, accept, see the held payment, meeting link and calendar download from both accounts; decline path.
- [ ] T028 [US3] Proposal screen (buyer), inbox screen (expert) and session screen with times in the viewer's time zone (FR-013, FR-014, FR-017).

**Checkpoint**: stories 1 to 3 pass independently.

## Phase 6: User Story 4 - The session ends and the expert is paid (P4)

**Independent test**: a held session releases its payment and shows on earnings; a cancelled one lifts its hold.

- [ ] T029 [P] [US4] Use-case tests for `cancelSession`, `markSessionHeld`, `earnings`, with a fixed clock (R11).
- [ ] T030 [US4] Implement in `src/product/usecases/session.ts` (FR-018, FR-019).
- [ ] T031 [US4] Earnings screen with price, fee and amount owed, and the note that payouts are made by hand; try-out clock on the account screen (FR-019).
- [ ] T032 [US4] Extend `e2e/product-booking.spec.ts` with cancel-before-start and mark-held-after-end.

## Phase 7: User Story 5 - The walkthrough still works, and everything is labelled (P5)

- [ ] T033 [P] [US5] `e2e/product-honesty.spec.ts`: every product route that touches a stand-in shows its label; payment screens say no money has moved (SC-007).
- [ ] T034 [P] [US5] `e2e/product-a11y.spec.ts`: axe, the 16px floor and focus rings on every product route (FR-024, SC-009).
- [ ] T035 [US5] Confirm the existing walkthrough specs pass unchanged and that it stores nothing (FR-023, SC-008).

## Phase 8: Polish

- [ ] T036 [P] Permission sweep test: for every use case, a second account gets `not-yours` and learns nothing (SC-005).
- [ ] T037 [P] Repeat-run tests for SC-002 (20 round trips) and SC-004 (50 acceptances with repeats and interruptions).
- [ ] T038 Update `README.md`, `AGENTS.md` (map of `src/product/`) and `specs/001-demo-walkthrough/contracts/services.md` to point at the new ports.
- [ ] T039 Run the full check set from `AGENTS.md`, the quickstart by hand, and record results in `specs/004-marketplace-foundation/verification.md`.

## Dependencies

- Phase 2 blocks every story. Within it, T003 to T010 are parallel; T011 needs T005; T012 needs T001 and T005.
- Story 2 needs published experts, which tests seed directly, so it can be built without story 1's screens.
- Story 3 needs stories 1 and 2's use cases. Story 4 needs story 3.
- Suggested first release: Phases 1 to 3.
