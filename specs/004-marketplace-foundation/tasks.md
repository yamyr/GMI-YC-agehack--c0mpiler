# Tasks: Marketplace Foundation

**Input**: [spec.md](spec.md), [plan.md](plan.md) including its Plan Review, [research.md](research.md)
(R1 to R19), [data-model.md](data-model.md), [contracts/](contracts/)

Regenerated on 2026-11-14 after the plan review. Tests come first (constitution principle IV):
from Phase 3 on, each test task is committed failing before the task that makes it pass. `[P]`
marks tasks that touch different files. Each phase from 3 on is one pull request, stacked on the
previous one.

## Phase 1: Setup (done, pull request #19)

- [x] T001 Create `src/product/` folders and `src/product/copy.ts` with the stand-in labels (FR-022, FR-027).
- [x] T002 Route `#/app` to `ProductApp`; hide the entry inside Tauri (FR-023, FR-025); `site/_redirects` for `/app`.

## Phase 2: Foundation (done, pull request #19)

- [x] T003 [P] Model types, ids and cents helpers with unit tests in `src/product/model/` (FR-020).
- [x] T004 [P] Skill catalogue and keyword lookup with unit tests (R6).
- [x] T005 [P] Port interfaces and `ServiceStatus` in `src/product/ports/`.
- [x] T006 [P] `StorePort` contract suite and stand-in (R3; FR-008).
- [x] T007 [P] `AuthPort` contract suite and stand-in (R4; FR-001).
- [x] T008 [P] `PaymentsPort` contract suite and stand-in (R8; FR-015, FR-016).
- [x] T009 [P] `MeetingsPort` contract suite and stand-in (FR-017).
- [x] T010 [P] `AgentPort` contract suite and stand-in (R5).
- [x] T011 Use-case context and the shared access checks (R7, R11; FR-004).
- [x] T012 Product shell: service status, try-out notice, sign-in, role choice, sign-out (FR-001, FR-002, FR-022, FR-027).

## Phase 3: Groundwork from the plan review

- [x] T013 [P] Tests: route table resolves each address to a screen and redirects by role (R15); `AuthPort.forget` contract tests (R17); `setName` use case (R13).
- [x] T014 Route table in `src/product/routes.ts`; split the shell into `src/product/screens/` (sign-in, home) behind it; a shared `Standin` label component.
- [x] T015 `AuthPort.forget` in the stand-in; `setName`; make `Expert.age` optional in `src/demo/domain/types.ts` (R19).
- [x] T016 Add the product to `scripts/site-check.mjs` and move the shell browser tests onto routes.

## Phase 4: User Story 1 - An expert's profile is kept (P1)

**Independent test**: create an expert, publish with a price, start a new session, find it unchanged.

- [ ] T017 [P] [US1] Use-case tests: `saveProfileDraft`, `publishProfile`, `unpublishProfile`, `confirmPrice`, `deleteAccount`, including not-owner and not-signed-in refusals.
- [ ] T018 [P] [US1] Browser journey `e2e/product-expert.spec.ts`: interview, edit a skill, publish, confirm a price, reload, sign in again, unpublish and republish, delete the account.
- [ ] T019 [US1] Implement the profile and account use cases in `src/product/usecases/` (FR-003, FR-005, FR-006).
- [ ] T020 [US1] Interview screen: name question first, suggested replies or typing, an unmatched draft asks for more (R5, R13; principle I).
- [ ] T021 [US1] Profile screen (edit skill labels, remove a skill, publish, unpublish, self-declared marker) and price screen (suggestion with reasons, confirm).
- [ ] T022 [US1] Expert home (what to do next) and account screen (roles, sign out, delete).

## Phase 5: User Story 2 - A buyer is matched with real experts (P2)

**Independent test**: three stored experts (fit, no skill, price gap); a confirmed brief shows the fit and both reasons.

- [ ] T023 [P] [US2] Use-case tests: `saveBriefDraft`, `confirmBrief` (including regulated advice), `runMatch` (only matchable profiles, stale detection, 20-expert timing for SC-003).
- [ ] T024 [P] [US2] Browser journey `e2e/product-buyer.spec.ts` seeded with three experts: match, no match by skill, no match by price, stale match.
- [ ] T025 [US2] Implement in `src/product/usecases/brief.ts` and `match.ts`, calling `matchBrief` unchanged (FR-007, FR-009 to FR-012; R19).
- [ ] T026 [US2] Buyer home, brief conversation, brief review and match screens (FR-007, FR-011).

## Phase 6: User Story 3 - A session is booked and the payment is held (P3)

**Independent test**: a proposal accepted once holds one payment and yields a session with a link; a decline holds nothing.

- [ ] T027 [P] [US3] Use-case tests: `sendProposal`, `withdrawProposal`, `acceptProposal`, `declineProposal`: range checks, double accept, failed hold, overlapping proposals, wrong expert.
- [ ] T028 [P] [US3] `.ics` tests in `src/product/calendar/ics.test.ts` (R10).
- [ ] T029 [P] [US3] Browser journey `e2e/product-booking.spec.ts`: propose, accept, held payment, meeting link and calendar download from both accounts; decline path. Time zone pinned (R16).
- [ ] T030 [US3] Implement `src/product/usecases/booking.ts` (acceptance as one transaction) and `src/product/calendar/ics.ts` (FR-013 to FR-017).
- [ ] T031 [US3] Proposal screen with suggested times (R16), expert inbox, session screen with times in the viewer's time zone.

## Phase 7: User Story 4 - The session ends and the expert is paid (P4)

**Independent test**: a held session releases its payment and shows on earnings; a cancelled one lifts its hold.

- [ ] T032 [P] [US4] Use-case tests: `cancelSession`, `markSessionHeld`, `earnings`, with a fixed clock (R11).
- [ ] T033 [P] [US4] Extend `e2e/product-booking.spec.ts`: cancel before the start, mark held after the end using the try-out clock.
- [ ] T034 [US4] Implement `src/product/usecases/session.ts` (FR-018, FR-019).
- [ ] T035 [US4] Earnings screen (price, fee, owed, payouts by hand); try-out clock on the account screen.

## Phase 8: User Story 5 and polish

- [ ] T036 [P] [US5] `e2e/product-honesty.spec.ts`: every product route shows the label of each stand-in it depends on; payment screens say no money has moved; the R18 limits are stated (SC-007).
- [ ] T037 [P] [US5] `e2e/product-a11y.spec.ts`: axe, the 16px floor, overflow and focus rings on every product route (FR-024, SC-009).
- [ ] T038 [P] Permission sweep: for every use case, a second account gets `not-yours` and learns nothing (SC-005). Repeat runs for SC-002 (20 round trips) and SC-004 (50 acceptances with repeats).
- [ ] T039 [US5] Confirm the walkthrough's specs pass unchanged and that it stores nothing (FR-023, SC-008).
- [ ] T040 Update `README.md`, `AGENTS.md` and `specs/001-demo-walkthrough/contracts/services.md`; record results in `specs/004-marketplace-foundation/verification.md` after the full check set and the quickstart.

## After pull request #20 merges (not part of this run)

- [ ] T041 Rebase; adopt `t()` in `src/product/`; add the exemption from the completeness check, the English-only notice, and the translation pass (R14, R19).

## Dependencies

- Phase 3 blocks every story. Story 2's tests seed experts directly, so its use cases do not need story 1's screens. Story 3 needs stories 1 and 2. Story 4 needs story 3.
