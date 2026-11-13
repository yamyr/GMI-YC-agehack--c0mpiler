# Internationalization implementation plan

> For agentic workers: use parallel agents for independent app/site migrations; root owns shared core, integration and verification. Follow test-driven development.

**Branch**: `003-internationalization` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)
**Goal**: Make Agely usable in English and the 17 requested languages.
**Architecture**: A dependency-free JavaScript core and local message catalogs live under `site/i18n/`, with TypeScript declarations for the React app. React owns its locale context; the static site owns its own DOM adapter. Domain IDs, user text and canonical financial evidence remain separate from translated presentation.
**Tech stack**: Existing React 19, strict TypeScript, plain browser JavaScript, Intl, Tauri 2/Rust, Bun, Vitest and Playwright. The integration uses main's TypeScript 7/Vite 8/Vitest 5 upgrade; message-source auditing uses Vite's parser.

## Summary
Translate whole messages with numbered slots such as `Hello {0}`. Source English is the stable key and readable fallback. Seed content is localized when a new walkthrough is created, never by rewriting user edits. A confirmed locale change remounts the demo and invalidates pending requests. Static text is explicitly marked for localization and dynamic tools call the same translator.

## Technical Context
- Storage: localStorage key `agely.locale`; query `lang` overrides saved choice, which overrides navigator.languages, then English. Access must tolerate blocked storage.
- Platform: browser and Tauri WebView. No added dependency or service.
- Scope: 18 languages, 13 walkthrough steps, three static pages, live IPC.
- Performance: translations and formatting run locally; no external translation calls.
- Testing: fail-first unit tests for resolution, interpolation, formatting, advice and IPC; all-locale catalog validation; localized browser journeys and existing full checks.

## Constitution Check
- I: Keep token-based type/control sizes, localized accessible names, visible focus and all chapter axe/layout checks. Inspect long-text and CJK/Cyrillic layouts.
- II: Human publish/accept/book/pay controls remain separate and explicit. Language switch restart is itself confirmed.
- III: Preserve demo/estimate disclosures; label machine-generated translations and existing English media; limited keyword guard remains described as such.
- IV: Domain regressions are seen failing before implementation; run full required check set before claiming completion.
- V: No dependency, backend or runtime translation service. Reuse Intl and React state.
- VI: Attribute generated translation text in ATTRIBUTION.md. No new fonts or media.
Pre-design and post-design gates: PASS; no constitution amendment or exception required.

## Project Structure
- `site/i18n/core.js`, `core.d.ts`: locale negotiation, translator and Intl formatters, safe preference access. No DOM or React dependency.
- `site/i18n/catalogs/*.js`: flat per-language maps keyed by English source messages.
- `site/i18n/messages/*.json`: English source inventories used by the validator and translators.
- `site/i18n/site.js`, `site.css`: static-page language adapter and selector.
- `src/i18n/`: React context, selector and script translation helpers.
- Existing app screens/domain/state and live TS/Rust boundary: explicit translation and locale propagation.
- `scripts/i18n-check.mjs`: rerunnable coverage and interpolation audit.
- `e2e/i18n.spec.ts`: language persistence, confirmation, translated journeys and layout.
- `specs/003-internationalization/`: spec, research, contracts, tasks and verification record.

## Global Constraints
USD remains USD. Locale changes do not imply a time-zone change. No catalog HTML is executed. Names, URLs, IDs, user edits and source evidence remain as authored. Every non-English translation is a model-generated draft requiring language review.

## Review Focus
1. Invalid locale/query/storage data must fall back without crashing.
2. User edits and pending agent turns must survive cancellation and cannot cross a confirmed restart.
3. Locale-sensitive grouping must not alter the meaning of whole-dollar inputs.
4. Translated labels must not change simulator grouping or app navigation identifiers.
5. Error boundaries must stay independent of a possibly failed translation provider.

## Approaches considered
1. Shared local catalogs and thin React/static adapters, selected by builder after authorization to proceed. Shares language behavior without introducing a framework or service.
2. React-only translation library plus a separate website implementation. Rejected because it duplicates locale rules and adds a dependency without a need.
3. Runtime automatic translation or DOM rewriting of React content. Rejected because it adds a service or risks overwriting user content and React rendering.

## Complexity Tracking
No constitution violations.

## Execution
See tasks.md for fail-first tests, exact paths, interface contracts and dependency order. Shared APIs are fixed in contracts/localization.md before parallel migrations. Root integrates and runs full checks; no merge or deployment is included.

## Tamil and Hindi extension

User requested these languages on 2026-11-14 within the same feature. Add `ta`/`ta-IN` and `hi`/`hi-IN` to the shared registry and typed/native allowlists. Extend the existing catalogs with the same 602 source messages, native decimal-digit parsing, representative advice examples, and all-screen browser checks. No new dependency, font asset, service, currency or time-zone behavior is introduced. See T020 through T022.
