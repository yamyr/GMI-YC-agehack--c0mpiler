# Verification: Marketplace Foundation

Recorded on 2026-11-14, on the branch `004-us5-honesty-and-polish` (the top of the stack), on
macOS. Only what was run is listed (constitution principle IV).

## Checks run, and their results

| Check | Result |
| --- | --- |
| `bunx tsc --noEmit` and `bunx tsc -p e2e/tsconfig.json` | Pass |
| `bun run test` (Vitest) | 284 passed in 28 files; 140 of them in `src/product/` |
| `bun run check:site` | No problems on 5 pages in 3 views, including the product's sign-in page |
| `bun run build` | Pass; the app bundle is 342 kB (101 kB gzipped), up from 274 kB before this feature |
| `bun run e2e --workers=2` (Playwright) | 90 passed |
| `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` | Pass; 18 Rust tests passed, 1 ignored (the opt-in real-Codex test) |
| `cargo deny check` | advisories, bans, licences and sources all ok |

## Success criteria

| Criterion | How it was checked | Result |
| --- | --- | --- |
| SC-001 Expert to a published, priced profile without typing more than an address | `e2e/product-expert.spec.ts`: one email address, one name, and picked replies | Met for typing. The 10-minute limit was not timed with a person. |
| SC-002 A published profile is found unchanged later, 20 times | `sweep.test.ts`: 20 sign-out and sign-in rounds, each also read through a new adapter | Met |
| SC-003 Match shown within 2 seconds with 20 experts | `brief.test.ts` times `runMatch` over 20 stored experts | Met |
| SC-004 One held payment per accepted proposal across 50, with repeats and interruptions | `sweep.test.ts`: 50 acceptances, every second submitted three times, every third interrupted after the hold | Met |
| SC-005 Nobody reads or changes what is not theirs | `sweep.test.ts`: a third account calls every use case against others' data | Met: 12 refusals, 5 empty results, nothing leaked, nothing changed |
| SC-006 Whole journey on stand-ins, no outside service | `e2e/product-booking.spec.ts`, from two sign-ins to a released payment | Met. The product makes no network request of its own; this was not asserted by a test. |
| SC-007 Every screen that depends on a stand-in is labelled | `e2e/product-sweep.spec.ts` over all 13 routes | Met |
| SC-008 The walkthrough still passes its checks | The pre-existing specs in the same run | Met: unchanged and green |
| SC-009 New screens pass the accessibility checks | `e2e/product-sweep.spec.ts`: axe WCAG 2.1 AA, the 16px floor including form controls, overflow, focus rings | Met |
| SC-010 Each stand-in passes a shared suite | `src/product/standins/standins.test.ts` | Met for all five |

## What the checks found along the way

- The date and time field on the proposal screen was unstyled and small. The audit had missed it
  because it only measured elements with text nodes; it now measures form controls too.
- The same field showed no focus ring on its built-in calendar button. Found by the sweep; fixed.
- Two test selectors matched the same label in two places. Fixed in the tests.

## What was not done

- **The quickstart was not walked through by hand.** Its five steps are covered by the browser
  journeys, and I looked at screenshots of the sign-in, home, interview, profile, proposal and
  session screens at 1440 px. Nobody has used the product with a real person.
- **Phone width.** The browser projects are 1440 by 900 and 960 by 640, as for the walkthrough.
  Only the sign-in page was checked at 390 px, by the website check.
- **Dark mode.** The app has none; nothing was checked.
- **Internationalization.** This original stack run preceded T041. See the follow-up below.
- **Load.** During development some browser runs stalled while the machine was heavily loaded by
  other work. They passed when re-run with two workers. No test was changed to hide a failure;
  two long audited journeys were given `test.slow()`.

## Test-first record

From the groundwork phase on, each phase's failing tests were committed before the code that
passes them, with one exception: in story 3 the booking use cases were committed together with
the failing browser journey, after their failing unit tests. The three unit sweeps for SC-002,
SC-004 and SC-005 passed as soon as they were written; they confirmed existing behaviour.

## T041 marketplace localization

The local `codex/marketplace-i18n` branch combines the marketplace stack at `e425c06` with the
version of `main` that includes #20 at `dce0e89`. The existing pull request branches retain their
history. The marketplace uses the shared draft catalogs for English and all 17 additional
locales. The completeness check includes product copy and validates interpolation slots.

- Both TypeScript checks passed. Vitest passed 379 tests across 38 files. The catalog check passed
  881 messages in each of 17 draft locales, including 278 new marketplace messages.
- Playwright passed 318 tests with two workers. Marketplace sign-in was exercised in every
  locale. French and Tamil buyers used translated suggestions and kept typed edits after locale
  changes. A Hindi booking used native digits and exported an iCalendar file with the same
  amount, names and session instant. Back and Forward retained the language after reload.
- The marketplace route sweep checked the 16px text floor, overflow, keyboard focus, stand-in
  disclosures and axe WCAG 2.1 AA. Phone checks covered German, Finnish, Tamil and Hindi. An
  additional 390px journey signed in using Simplified Chinese, switched to Tamil mid-interview,
  published a profile and confirmed a price using Tamil digits. A caption overflowing its
  card reproduced in that run and now has a browser regression.
- Both production builds passed. The built website passed 105 checks over five paths, three
  views and seven representative languages. The sign-in check opened the marketplace at its
  language-qualified hash and measured layout, text size and axe violations. The app build was
  restored in `dist/` for Tauri.
- Rust formatting, Clippy with warnings denied, advisory and licence checks, and workflow lint
  passed. Rust tests passed 22 tests. The existing real-Codex test remained ignored.
- Website follow-ups fix recognition of explicit Simplified Chinese tags, preserve the displayed
  simulator week when changing language, and translate five cost-ledger disclosures. Canonical
  cost amounts and evidence keep their original values.

The catalogs contain machine-generated drafts. Native-speaker review and a real-user trial
remain pending. The marketplace drafting agent recognizes a limited set of skill phrases and
numeric formats. The local build retains the Vite chunk-size warning because the language
catalogs are available without a runtime translation service.

### Follow-up reliability checks

- Blocked access to browser storage, blocked reads and blocked writes now show a localized
  recovery screen with a way back to the walkthrough. Each case passed at both app test sizes.
  French, Tamil, Hindi and Simplified Chinese recovery screens also passed desktop and 390px
  phone checks for layout and axe.
- A French buyer can enter `1 h 30 min`, correct a fractional budget without repeating the
  earlier answers, and review a 90-minute brief with a USD 1,500 to 2,400 budget. Grouped amounts
  also passed German and Hindi regressions. Ambiguous inputs save no draft and ask the buyer
  for two whole USD amounts.
- The website picker labels each option with its own language tag. The simulator preserved both
  the displayed week and the selected expert when changing languages. Keyboard selection was
  verified in muted Chromium at 390px and 1440px.

After these changes both TypeScript checks, Vitest (398 tests in 38 files), the catalog check
(884 messages across 17 draft locales), the full browser suite (326 tests), both production
builds, Rust formatting, Clippy, 22 Rust tests, cargo deny and workflow lint passed. The
105-combination website sweep passed after the site and storage changes. The final parser
revision passed focused built-site checks for Tamil phone and German desktop.
