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
- **Internationalization.** The product is English only until pull request #20 merges (T041).
- **Load.** During development some browser runs stalled while the machine was heavily loaded by
  other work. They passed when re-run with two workers. No test was changed to hide a failure;
  two long audited journeys were given `test.slow()`.

## Test-first record

From the groundwork phase on, each phase's failing tests were committed before the code that
passes them, with one exception: in story 3 the booking use cases were committed together with
the failing browser journey, after their failing unit tests. The three unit sweeps for SC-002,
SC-004 and SC-005 passed as soon as they were written; they confirmed existing behaviour.
