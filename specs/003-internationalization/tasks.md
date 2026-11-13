# Tasks: Internationalization and localization

Input: spec.md, plan.md, research.md, data-model.md, contracts/localization.md
Tests are required by constitution IV. Each implementation follows a failing test or failing catalog audit. Shared API names are fixed in the contract.

## Phase 1: Setup
- [x] T001 Audit source/build boundaries and record defaults and alternatives in specs/003-internationalization/research.md.
- [x] T002 Create feature specification, clarification record and plan in specs/003-internationalization/.

## Phase 2: Foundation
- [x] T003 Write and observe failing negotiation, storage, interpolation, formatting and plural tests in site/i18n/core.test.js.
- [x] T004 Implement shared locale/translator/formatter APIs and declarations in site/i18n/core.js and core.d.ts per contracts/localization.md (FR-001, FR-002, FR-005, FR-006, FR-010).

## Phase 3: US1 language selection
- [x] T005 [US1] Add React provider and confirmed-restart language selector in src/i18n/index.tsx and src/App.tsx, preserving standalone error boundary (FR-001, FR-002, FR-003).
- [x] T006 [US1] Add persistence, invalid input and cancellation browser journeys in e2e/i18n.spec.ts (FR-002, FR-003, FR-012).

## Phase 4: US2 app and live conversations
- [x] T007 [US2] Write and observe failing translated content/formatting/advice tests in src/i18n/ and src/demo/domain/advice.test.ts (FR-004, FR-005, FR-008).
- [x] T008 [US2] Migrate screens, seeded content, notices and explanations in src/demo/ to explicit translators; inventory source strings in site/i18n/messages/app.json (FR-004, FR-005, FR-006).
- [x] T009 [P] [US2] Add validated locale to TS/Rust AgentBrief and native prompt tests in src/demo/live/ and src-tauri/src/agent/ (FR-007).
- [x] T010 [US2] Add representative restricted advice patterns for each supported language in src/demo/domain/advice.ts, preserving business matching and validation semantics (FR-008).

## Phase 5: US3 website
- [x] T011 [P] [US3] Add safe static-page language adapter and source inventory in site/i18n/site.js and messages/website.json; localize site/index.html, site/simulator/ and site/costs/ presentation without mutating canonical records (FR-009).
- [x] T012 [US3] Verify translated simulator/ledger logic with unit tests and inspect all website pages at phone/desktop sizes (FR-009, FR-012).

## Phase 6: Catalogs and cross-cutting verification
- [x] T013 Add rerunnable coverage/slot validator in scripts/i18n-check.mjs; observe failure on missing catalogs before adding them (FR-011, SC-002).
- [x] T014 [P] Write draft catalogs for fr/es/de/it/da in site/i18n/catalogs/ (FR-001, FR-004, FR-006, FR-009).
- [x] T015 [P] Write draft catalogs for zh-Hans/ko/ja/id/tl in site/i18n/catalogs/ (FR-001, FR-004, FR-006, FR-009).
- [x] T016 [P] Write draft catalogs for uk/pl/ro/nb/fi in site/i18n/catalogs/ (FR-001, FR-004, FR-006, FR-009).
- [x] T017 Attribute generated content in ATTRIBUTION.md and document translation maintenance and fallback behavior in CONTRIBUTING.md (FR-010, FR-011).
- [x] T018 Run source/catalog audit, both tsc checks, unit tests, app build, localized/full Playwright, all Rust checks, website build/check; record exact results in specs/003-internationalization/verification.md (FR-012, SC-001 through SC-005).
- [x] T019 Review final diff against spec/plan/tasks and address important findings before handing off feature branch (FR-001 through FR-012).

## Dependencies and parallel execution
T001 → T002 → T003 → T004. US1/US2 app migration and US3 website adapter can then proceed independently with disjoint files, using the shared API contract. T009 native work is independent of UI migration except the agreed locale field. Once source inventories stabilize, T014/T015/T016 run in parallel by locale ownership. Catalog audit T013 runs before and after translations. T018 follows all changes; T019 reviews the real artifact. Do not run app and site builds concurrently because both replace dist/.

## Independent tests and implementation strategy
US1 delivers selectable/persisted locale and explicit restart even before catalog completion. US2 adds localized story and live response language while preserving decisions. US3 adds localized static pages and tools. Complete all requested catalogs and verification before claiming the feature is done. Tests assert exact native labels/translated accessible names, not only presence of locale metadata.


## Phase 7: Tamil and Hindi extension

Added by explicit user request on 2026-11-14 after the original-language checks passed. Earlier verification counts describe that earlier scope.

- [x] T020 [US1] Extend locale metadata/types, regional resolution, Indian formatting, native decimal parsing and representative advice tests in site/i18n/core.js, src/demo/screens/shared.tsx and src/demo/domain/advice.ts; extend native enum/prompt tests in src-tauri/src/agent/ (FR-001, FR-002, FR-005, FR-007, FR-008).
- [x] T021 [P] [US2] Draft all 602 messages in site/i18n/catalogs/ta.js and hi.js and wire them into catalogs/index.js, with exact slot parity (FR-004, FR-006, FR-009, FR-010, FR-011).
- [x] T022 Extend all-language persistence, all-13-screen accessibility/layout, native-digit pricing journeys and website script matrices in e2e/i18n.spec.ts and scripts/site-check.mjs; run the full required check set for the expanded scope and finalize specs/003-internationalization/verification.md (FR-012, SC-001 through SC-005).
