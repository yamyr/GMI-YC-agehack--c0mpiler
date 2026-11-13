# Verification record

Status: verified locally for English plus all 17 requested languages, including Tamil and Hindi.

## Current result

| Check | Observed result |
| --- | --- |
| App TypeScript | Passed: `bunx tsc --noEmit` |
| E2E TypeScript | Passed: `bunx tsc -p e2e/tsconfig.json` |
| Unit tests | 22 files, 212 tests passed on main's TypeScript 7/Vite 8/Vitest 5 toolchain |
| Catalog/source audit | 602 messages, 17 draft locales, 10,234 translated entries; no missing keys or slot mismatches |
| Full browser suite | 262 tests passed with two workers and the unchanged 30-second timeout |
| App and website builds | Passed; existing Vite bundle-size warning remains |
| Rust formatting and Clippy | Passed, all targets with warnings denied |
| Rust tests | 22 passed; one existing opt-in real-Codex test ignored |
| Dependency policy | Advisories, bans, licences and sources passed |
| Final website gate | Four paths, three views, seven languages: 84 combinations passed, including internal currency-card clipping and caption-overlap guards |
| Independent review | Original filename finding fixed with a failing-first regression; extension review found no actionable issue |

Translations are model-generated drafts, not native-speaker certification. The real authenticated
Codex smoke test was not run. Existing English media and source evidence retain their language.
The offline advice guard still recognizes representative keywords rather than classifying every
possible request. All catalogs ship locally; the app JavaScript is 460.10 kB gzip and triggers
Vite's existing chunk-size warning. No dependency or runtime translation service was added.

The plain app build is restored in `dist/` after website verification so Tauri opens the app.
The branch is published as [PR #20](https://github.com/yamyr/agely/pull/20). Final CI and
production deployment are pending; the record below distinguishes observed checks from rollout intent.

## Integration with current main

The user authorized deploying the draft translations for early-user feedback. The initial PR run
passed Rust, dependency policy, workflow lint and the full browser/website job. Its frontend jobs
found that main's TypeScript 7 upgrade removed the compiler API used by the new catalog checker.
After merging main, the checker uses the parser exported by the existing Vite dependency.
The original extraction test and two added parser regressions failed first, then all 212 unit
tests passed. Both TypeScript checks, catalog integrity, both builds and the full 84-combination
website gate also passed with the new toolchain. Independent review found no issue with the fix.
No dependency was added and no check was weakened.

The following sections retain the chronological evidence, including earlier-scope counts.

## Starting point

The working checkout was clean on `chore/agents-and-constitution` at `426a38f`.
Feature branch `003-internationalization` was created from that checkout, in place.
No separate worktree was created and no existing files were discarded.

- Baseline `bun run test`: 16 files, 144 tests passed.
- Baseline `bunx tsc --noEmit`: passed.

## Failing-first evidence

- Shared core tests failed because core.js did not exist, then passed after implementation.
- Catalog audit tests failed because the audit module did not exist; source-inventory regression failed because extraction was absent. Both passed after implementation.
- Full catalog audit failed with missing language entries before draft catalogs were written.
- Multilingual restricted-advice tests failed for all 15 requested languages before patterns were extended.
- Native tests failed because invalid locale inputs were accepted and response-language prompt instructions were absent. After implementation: 22 Rust tests passed and the existing real-Codex opt-in test stayed ignored.
- Website adapter tests failed because the module did not exist. Targeted site/model/ledger tests subsequently passed.
- Inline-link spacing regression reproduced joined words after translation. Preserving source boundary whitespace made the test pass.

## Design and consistency review

The spec has 12 functional requirements, each mapped to tasks T003 through T019.
No critical/high ambiguity, unmapped requirement or constitution conflict was found before implementation.
The scope defaults are builder choices after the user instructed proceeding without answering the scope question.
The existing constitution was read and retained; no amendment was necessary.
The repository has no update-agent-context.sh script; the contract and plan document the shared APIs instead of generating a new machine-specific instruction file.

## Remaining verification

Catalog completion, integrated app checks, browser journeys, localized layouts, final Rust checks,
website build/check and an independent diff review will be recorded below as they run.

## Integration and independent review

- Both TypeScript checks passed after app integration.
- Integrated unit suite: 22 files, 199 tests passed before the source-filename regression was added.
- App production build passed. Vite reports a bundle-size warning because local catalogs are bundled; the limit was not raised or suppressed.
- English browser flow/layout/keyboard/offline subset: 14 passed. The two aggregate accessibility tests timed out at 30 seconds under five concurrent workers; unchanged tests then passed with one worker, 13.6 and 14.2 seconds for all 13 screens at the two viewport sizes. No accessibility rule was removed or timeout increased.
- Language-selector regression reproduced selecting the active language leaving a pending foreign choice. After correction, the browser test passed.
- Live IPC browser stub verified request locales en/fr, rejected the effect of a late old reply after confirmed restart, and displayed the new French reply. Test passed.
- French persistence, edit-preserving cancellation and complete human-decision walkthrough: three browser tests passed.
- Final Rust source checks: cargo fmt and clippy passed; cargo test passed 22 tests, with the existing opt-in real-Codex test ignored.
- cargo deny passed advisories, bans, licences and sources after sandbox cache access was approved. Initial sandbox attempt could not lock the read-only advisory cache.
- Fresh independent code review found one P2 issue: fictional source PDF filenames changed under translation. A new seed test failed before the fix and passed after preserving the authored source references. No other confirmed correctness finding was reported. Reviewer independently ran six focused files, 65 tests passed.
- Review exclusions: human language quality remains unreviewed and visibly draft; catalog completeness and browser layouts are gated by the remaining full checks; the real authenticated model test remains opt-in. These exclusions do not represent verified live-model behavior.

## Final verification and website corrections

- Full `bun run e2e --workers=2`: 202 tests passed in 4.7 minutes, including all 13 screens in German, Finnish, Simplified Chinese and Ukrainian at both app sizes; exact translated headings/chapter names and all 16 persisted language choices were checked. This uses the existing 30-second timeout and unchanged English accessibility gate.
- Source/catalog integrity: 602 source messages, 15 complete draft catalogs, matching interpolation slots; no unregistered literal translation calls.
- First built-website sweep inspected four paths in three views and five languages and saved 60 screenshots. It found Finnish home-link names that did not contain the visible brand as a separate word, and a Ukrainian phone simulator currency value overflowing the window by 3px.
- Added an all-language home-link name regression. It also detected Danish and Norwegian possessive forms. Those three labels now retain the exact visible brand. Focused Finnish desktop browser check passed all four paths.
- Widened the simulator's responsive statistic cards and allowed long values to wrap, preserving the type floor. The checker now also catches a value spilling outside its card even when document width stays unchanged. Focused Ukrainian phone check passed all four paths and its corrected screenshot was visually inspected.
- A separate static-page preference regression reproduced a language URL displaying French without updating a previous saved German preference. Startup now saves the resolved language through the existing storage-safe helper. The regression passed after the fix.
- Desktop/phone screenshots inspected directly included German landing/simulator/app, Simplified Chinese landing/ledger, Ukrainian app, and corrected Ukrainian phone simulator. CJK/Cyrillic text rendered, disclosures remained visible, and the corrected monetary values fit their cards.

The final unfiltered website check for the original-language scope passed all four paths in three views and five languages. After the last website corrections, both TypeScript checks and the full unit suite passed: 22 files, 202 tests. Catalog coverage remained 602 messages across 15 requested locales. The user then expanded the scope as recorded below.


## Tamil and Hindi expansion

User explicitly added Tamil and Hindi on 2026-11-14. The feature now includes 17 requested languages plus English. The shared message inventory is unchanged at 602 messages.

- Locale count/region-resolution tests failed before adding ta/hi, then passed.
- Native digit-input tests failed for Tamil and Devanagari digits before normalization; all 16 parser cases then passed, retaining rejection of grouped, fractional and rupee-denominated input.
- Representative legal/medical/financial advice regressions failed for both new languages before keyword examples were added, then passed. This remains a limited demo guard.
- Native prompt fixture failed on unsupported ta before adding the two enum variants. The native agent reports fmt, clippy and 22 tests passed, with the existing real-Codex test ignored. Root final integrated verification follows after catalogs are frozen.
- Existing native/script registry alignment test now covers all 18 canonical IDs.


### Expanded-scope results observed so far

- Both new draft catalogs contain all 602 messages. Root catalog audit passed 602 messages across 17 requested locales, with exact slot parity and no unregistered literal source calls.
- Both TypeScript checks passed. Full unit suite passed 22 files, 210 tests.
- App and website production builds passed. The app JavaScript is 1,426.12 kB before transfer compression and 457.79 kB gzip; Vite's existing size warning remains visible. All catalogs ship locally, with no runtime translation service.
- Root repeated Rust fmt, clippy, all tests and cargo deny for the expanded scope: passed. Tests: 22 passed, one existing real-Codex opt-in test ignored.
- Independent extension review found no actionable issue in Unicode digit mapping, advice examples, registry/type/native alignment or updated documents. Reviewer independently passed 63 focused tests. Native-speaker translation quality remains outside that review.
- Full expanded browser suite passed 262 tests in 5.5 minutes. It includes all 13 screens in both new languages at both app sizes, all 18 language choices, and native-digit price entry.
- Built-website sweep initially passed 84 combinations and produced screenshots for all seven representative languages. Direct inspection confirmed Tamil and Hindi glyph rendering, readable controls and unchanged USD values.
- Additional screenshot inspection revealed a long Tamil budget caption colliding with the first price label on phones. A new geometry check reproduced the collision; the caption now reserves its own height in normal flow instead of relying on fixed padding. The nested-text regression remains guarded, and all 210 unit tests and catalog checks passed after this correction.
- Focused Tamil phone check passed on all four paths; the corrected landing screenshot was visually inspected. The final unfiltered website gate then passed all 84 combinations with the new overlap guard enabled.
- Final diff review found no unrelated changed asset, dependency, canonical ledger record, or version. Spec Kit tasks T001 through T022 are complete.


## Completion

The final website gate passed all 84 combinations again after the intrinsic-caption correction,
with the caption-overlap guard active. The focused Tamil phone check also passed and its new
screenshot was inspected. App code did not change after the full 262-test browser pass.

All required checks are complete on the final source tree. The plain app build was restored
successfully after website checks. All 22 Spec Kit tasks are complete. No remote CI result,
release, push, merge or deployment is claimed by this local verification.
