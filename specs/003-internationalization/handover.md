# Internationalization handover

Recorded on 2026-11-14 after production verification. The feature is complete and deployed.
The next session can focus on early-user feedback rather than restarting implementation.

## Deployment and Git state

- [PR #20](https://github.com/yamyr/agely/pull/20) merged into `main` at `dce0e89a8ba6ba4816de455d724cffced374176a`.
- Production is [agely.dev](https://agely.dev). Cloudflare Pages confirmed deployment of that commit at [87216011.agely-1ss.pages.dev](https://87216011.agely-1ss.pages.dev).
- All PR checks passed before merge. The [production commit's CI run](https://github.com/yamyr/agely/actions/runs/43511174134) also passed all four jobs.
- Implementation commits are `049419b` and `260cc25`. Commit `69ae5e7` merged main's toolchain updates into the feature branch.
- The implementation used the existing checkout on `003-internationalization`. No separate worktree was created.
- This handover is on `docs/i18n-handover`, created from the deployed `origin/main`. The implementation branch is already merged.
- Git state and deployment details here describe the handover date. Later sessions must inspect current state before making changes.

The user explicitly chose to deploy model-generated drafts and collect feedback from early users.
Draft disclosures remain visible. No feedback collection service or form was added.

## Supported languages

English plus 17 requested languages are available across the walkthrough, live-agent interface,
landing page, simulator, and cost ledger. Danish appeared twice in the request and is included once.

| Locale ID | Language |
| --- | --- |
| `en` | English |
| `fr` | French |
| `es` | Spanish |
| `de` | German |
| `it` | Italian |
| `zh-Hans` | Simplified Chinese |
| `ko` | Korean |
| `ja` | Japanese |
| `da` | Danish |
| `uk` | Ukrainian |
| `pl` | Polish |
| `ro` | Romanian |
| `nb` | Norwegian Bokmål |
| `fi` | Finnish |
| `id` | Indonesian |
| `tl` | Tagalog |
| `ta` | Tamil |
| `hi` | Hindi |

Tamil and Hindi use Indian formatting locales. `no` resolves to `nb`, and `fil` resolves to `tl`.
Traditional Chinese and Norwegian Nynorsk are outside this scope.

## Decisions and behavior

- Locale selection uses `?lang=` first, then `agely.locale` in local storage, browser preferences, and English.
- The language selector uses native language names and updates the document language. Blocked storage cannot prevent startup.
- An app language change requires restart confirmation. Cancellation preserves edits. Confirmation starts a fresh walkthrough and excludes replies from the previous live session.
- English source messages are catalog keys. There are 602 distinct messages and 17 complete catalogs, totaling 10,234 translated entries.
- Missing, empty, or malformed translations fall back to English. Numbered interpolation slots such as `{0}` must match the source.
- Shared `Intl` helpers format dates, numbers, lists, plurals, and money. Amounts remain USD. Language selection does not change the time zone.
- Price entry accepts Tamil and Devanagari digits as ungrouped whole-dollar input. Grouped, fractional, and rupee-denominated input remains invalid.
- Names, domain IDs, filenames, user edits, and canonical ledger evidence retain their authored values. The original English video is labeled.
- Native live requests validate the locale against an enum and request replies in that language. JSON keys and human confirmation boundaries remain unchanged.
- Translations render as text. Catalogs ship locally, with no runtime translation service or new dependency.

## Code and specification map

| Path | Responsibility |
| --- | --- |
| `site/i18n/core.js` and `core.d.ts` | Shared locale registry, resolution, interpolation, and formatting |
| `site/i18n/catalogs/` | Draft translations and catalog registration |
| `site/i18n/messages/` | English source inventories |
| `src/i18n/index.tsx` | React context, selector, and restart confirmation |
| `src/i18n/seeds.ts` | Translated story fields with original evidence preserved |
| `src/demo/` | Translated screens, domain explanations, and live requests |
| `src-tauri/src/agent/` | Native locale enum, prompt, and tests |
| `site/i18n/site.js` | Static-page translation and language propagation |
| `scripts/i18n-check.mjs` | Catalog coverage, slot parity, and AST source audit |
| `scripts/site-check.mjs` | Website accessibility, layout, and translated-content geometry checks |
| `e2e/i18n.spec.ts` | Persistence, restart, stale replies, translated screens, and native-digit journeys |

The full Spec Kit cycle is recorded in [spec.md](spec.md), [research.md](research.md),
[plan.md](plan.md), [data-model.md](data-model.md), [contracts/localization.md](contracts/localization.md),
[tasks.md](tasks.md), and [verification.md](verification.md). All 22 tasks are complete.
Translation editing rules are in [CONTRIBUTING.md](../../CONTRIBUTING.md#maintain-translations).

## Verification baseline

These results were observed on the final implementation and its integration with current main.
They are a baseline for the next session, not a substitute for checks after later changes.

| Check | Result |
| --- | --- |
| Both TypeScript checks | Passed |
| Unit tests | 212 passed across 22 files |
| Catalog audit | 602 messages across 17 draft locales passed |
| App and website builds | Passed with the existing bundle-size warning |
| Playwright | 262 passed with two workers |
| Website checker | Four pages, three views, seven representative languages; all 84 combinations passed |
| Rust format and Clippy | Passed, warnings denied |
| Rust tests | 22 passed; one existing opt-in real-Codex test ignored |
| Cargo dependency policy | Advisories, bans, licences, and sources passed |
| Independent reviews | Findings fixed and rechecked; final parser integration review found no issue |
| PR and production CI | Passed |

Production checks confirmed that all 17 catalog assets returned HTTP 200. The Tamil homepage,
Hindi walkthrough, Ukrainian simulator, and French ledger rendered in their selected languages.
The language preference persisted, the draft notice was visible, and the browser reported no errors.
The Tamil homepage fit a 390px phone viewport. The Hindi app fit its 960px minimum width.

## Integration details that matter next time

- Main upgraded to TypeScript 7, Vite 8, and Vitest 5 during this work. The catalog audit now imports `parseSync` from Vite. The old TypeScript compiler API failed in CI and must not be restored.
- `bun run build` and `bun run build:site` both replace `dist/`. Website checks need the website build. Tauri needs the plain app build, which was restored at session end.
- Existing Cloudflare Pages Git integration builds the website and `/demo/` when `CF_PAGES=1`. Merging to `main` publishes.
- Port 1420 belongs to Tauri. Browser tests default to 1493. The final local rerun used `E2E_PORT=1494 bun run e2e --workers=2` because 1493 was occupied.
- Earlier aggregate accessibility tests timed out with five concurrent workers. They passed unchanged with two workers. No accessibility assertion or timeout was weakened.
- One macOS Rust CI job was cancelled before any step ran. Its rerun passed. No code change was needed for that cancellation.

## Follow-up work

No implementation or deployment task remains from this request. Follow-up candidates are:

- Collect early-user corrections with the locale, page or chapter, exact displayed text, and suggested replacement.
- Apply reviewed wording to the relevant catalog, preserve interpolation slots, and run the catalog audit plus affected checks.
- Arrange human language review before changing the draft notices. Current completeness checks do not certify translation quality.
- Consider catalog splitting if loading performance becomes a problem. The deployed app bundle is about 460.10 kB gzip and includes all catalogs.
- Run an authenticated Codex language smoke test only with authorization for its usage cost. Native prompt tests and IPC stubs passed; real-model language behavior was not exercised.
- Treat the multilingual advice guard as a limited keyword demonstration. It does not classify every possible request.

## Next-session prompt

```text
Continue Agely from specs/003-internationalization/handover.md.
Read AGENTS.md and the constitution, then inspect git status and current main.
PR #20 is already merged and the 17-language rollout is live, including Tamil and Hindi.
The user chose early-user feedback while retaining visible draft-translation notices.
Do not repeat the completed Spec Kit implementation or redeploy it unnecessarily.
Use a fresh branch from current main for new work, preserving any local changes.
Start with the translation feedback or follow-up task I provide next.
```
