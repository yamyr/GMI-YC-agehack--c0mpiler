# Feature Specification: Internationalization and localization

**Feature Branch**: `003-internationalization`
**Created**: 2026-11-13
**Status**: Implemented and verified locally
**Input**: Add i18n and l10n modules for French, Spanish, German, Italian, Chinese, Korean, Japanese, Danish, Ukrainian, Polish, Romanian, Norwegian, Finnish, Indonesian, Tagalog, Tamil and Hindi. Brainstorm first and complete the Spec Kit cycle. User subsequently instructed: "please proceed".

## Clarifications
### Session 2026-11-13
- Q: App interface, complete walkthrough, or whole experience? A: User authorized proceeding without further choices. Builder chooses whole experience, with the defaults below.
- Builder choices: Simplified Chinese, Norwegian Bokmål, general French and Spanish, Indonesian, Tagalog, Tamil and Hindi; retain English and the fictional US setting. Translations are model-generated drafts, attributed and visibly identified. Existing video remains English and is labelled as such; translated video/audio production is outside this software change.

### Session 2026-11-14
- User added Tamil and Hindi to the existing feature. Canonical IDs are `ta` and `hi`, with India as the default formatting region; prices remain USD and time zone remains unchanged. Native Tamil and Devanagari decimal digits are accepted in ungrouped whole-dollar input. All catalog, native-agent and accessibility requirements apply to the expanded list.

## User Scenarios & Testing
### User Story 1 - Choose and retain a language (Priority: P1)
An older expert or buyer selects a language using its own name and can return to the same language later.
**Why this priority**: A translation is useful only when people can find and retain it.
**Independent Test**: Select French, reload, and verify French text and document language.
**Acceptance Scenarios**:
1. Given no saved choice, when opening Agely, then a supported browser language is selected, otherwise English.
2. Given a saved choice, when reopening the app or website, then it takes precedence over browser preferences.
3. Given an active walkthrough, when choosing another language, then restarting requires an explicit confirmation, and cancelling preserves edits and pending work.
4. Given storage is unavailable or a language is unsupported, when opening a page, then it remains usable with a supported language and no crash.

### User Story 2 - Complete the localized walkthrough (Priority: P1)
A person can follow the scripted story, review suggestions, make decisions and see recovery messages in their chosen language.
**Why this priority**: Publishing, accepting and paying must remain understandable, explicit human actions.
**Independent Test**: Traverse all chapters with translated headings, buttons and accessible names; confirm USD amounts and unchanged decisions.
**Acceptance Scenarios**:
1. Given any supported language, when walking through chapters, then interface, seeded story, reasons and validation messages use its catalog, with honest English fallback for missing entries.
2. Given a localized profile or brief, when editing it, then names, IDs, numerical values and matching rules retain their meaning.
3. Given a restricted advice request in a supported language, when confirming a brief, then representative legal, medical and financial requests are declined with an explanation. This remains a limited deterministic demo guard, not a general classifier.
4. Given a ready live agent, when requesting a turn, then the chosen response language reaches the native prompt. Changing language cannot apply an old response to a new walkthrough.

### User Story 3 - Use localized website tools (Priority: P2)
Visitors can read the landing page and operate the simulator and cost ledger in their chosen language.
**Why this priority**: The website is the entry point and explains the product's numbers.
**Independent Test**: Switch language on each static page, operate the simulator, and inspect ledger values and disclosures.
**Acceptance Scenarios**:
1. Given a language choice, when following site links to another page or the demo, then that choice is retained.
2. Given simulator controls, when changing language, then labels change while model identifiers, settings and results retain their meaning.
3. Given ledger entries, when localizing display, then source evidence, amounts, payment/estimate distinctions and canonical records remain intact.

### Edge Cases
- Browser region tags, unsupported Chinese Traditional and Norwegian Nynorsk; invalid query/storage input.
- Empty or missing catalog entries; mismatched interpolation parameters; literal braces and translated HTML-like strings.
- Storage disabled; language switch cancellation; stale native responses after restart.
- Long German/Finnish text and CJK/Cyrillic fonts at minimum app size and phone website widths.
- User-authored text, URLs, names and technical diagnostics must not be automatically rewritten.

## Requirements
### Functional Requirements
- **FR-001**: Offer English plus all 17 unique requested languages, named in their own languages, with language metadata matching displayed content.
- **FR-002**: Resolve explicit supported language choice, saved choice, browser preferences, then English; safely persist choice when possible.
- **FR-003**: Require explicit restart confirmation before changing the app language; cancel preserves the walkthrough.
- **FR-004**: Localize interface, accessibility names, seed content, suggestions, reasons, notices and recovery instructions; preserve canonical identifiers and user text.
- **FR-005**: Format numbers, percentages, dates, lists and USD using the chosen language. Do not convert currency, change commercial rules or infer a new time zone from language.
- **FR-006**: Provide whole-message interpolation and grammatical plural selection; missing translations use readable English and a visible draft/fallback disclosure.
- **FR-007**: Carry a validated language across the live IPC boundary and instruct the agent to use it for messages and suggested replies; preserve existing safety and request-ID rules.
- **FR-008**: Extend deterministic restricted-advice examples to all supported languages, with failing-first regression tests and explicit limits documented.
- **FR-009**: Localize all three static pages and tool output without changing simulator logic or canonical cost evidence. Identify the existing English video.
- **FR-010**: Ship catalogs locally without a translation service, new dependency, backend or runtime translation network request. Record model-generated text attribution.
- **FR-011**: Check catalog coverage and interpolation parity with a rerunnable tool; use text-safe rendering, never execute translated HTML.
- **FR-012**: Preserve 16px minimum text, 56px primary controls, visible focus, demo labels and separate human decisions. Add localized journeys and layout/accessibility checks.

### Key Entities
- Language: canonical identifier, native label and formatting locale.
- Message: English source, translated draft and interpolation slots.
- Language preference: explicit or saved choice with browser fallback.
- Localized seed: translated fictional content sharing the original domain IDs and values.

## Success Criteria
### Measurable Outcomes
- **SC-001**: All 18 language choices render and survive a reload when storage works.
- **SC-002**: All shipped message keys have nonempty draft translations with matching interpolation slots in all requested languages; gaps are reported, never hidden by copied English.
- **SC-003**: All 13 app steps remain reachable and labelled; translated journeys exercise human decisions and switching.
- **SC-004**: Representative legal, medical and financial requests in each supported language are declined by regression tests.
- **SC-005**: App and site verification detects overflow, undersized text and accessibility failures in representative long-text, CJK and Cyrillic locales.

## Assumptions
- No human language reviewers were supplied; draft status is visible and attribution records provenance.
- Native names, US story setting, USD values and raw source evidence stay as authored.
- Same site URLs with a language query/preference are sufficient; separate indexed translated routes, regional commercial behavior, voice implementation and translated video assets are out of scope.
