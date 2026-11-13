# Localization contracts

## Shared core: site/i18n/core.js
- `LOCALES`: readonly entries `{ id, label, intl }` for the 18 canonical languages.
- `resolveLocale(preferences: readonly string[]): Locale`: canonicalizes supported region tags and aliases; defaults to en. Ignore malformed/unsupported input.
- `initialLocale(): Locale`: browser query `lang`, saved `agely.locale`, navigator.languages, English; SSR returns English.
- `saveLocale(locale: Locale): void`: best-effort safe localStorage write.
- `createTranslator(locale: Locale): Translator`, where `Translator = (source: string, ...values: readonly (string | number)[]) => string`. Numbered slots; return English for missing entries. Replace slots once, not recursively. Values are text, not HTML.
- `formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string`.
- `formatMoney(value: number, locale: Locale, digits = 0): string`: always USD.
- `formatDate(value: Date, locale: Locale, options?: Intl.DateTimeFormatOptions): string`.
- `formatList(values: readonly string[], locale: Locale): string`.
- `pluralCategory(count: number, locale: Locale): Intl.LDMLPluralRule`.

## React: src/i18n/index.tsx
`I18nProvider` provides `useI18n(): { locale: Locale; t: Translator; setLocale(locale: Locale): void }`. App selector owns proposed language and restart confirmation; active locale changes only after explicit action. DemoApp uses locale as a React key.

## Migration conventions
All user-facing source strings are registered in `site/i18n/messages/app.json`, `website.json` or `website-extra.json`, each a sorted JSON string array. Shared selector and recovery copy is included in these inventories. Preserve English source exactly to retain existing tests. Screens use useI18n().t; pure functions receive a default-English locale or translator argument. Translate seed content at initialization, never generic user strings. Parameterized sources use `{0}` slots.

Static HTML uses explicit localization markers, and dynamic JavaScript invokes the shared translator. Preserve simulator model IDs and ledger source records.

Native AgentBrief accepts only canonical locale values; omission defaults to English. No arbitrary locale string enters prompt instructions.
