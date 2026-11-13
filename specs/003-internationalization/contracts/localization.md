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
`I18nProvider` provides `useI18n(): { locale: Locale; t: Translator; setLocale(locale: Locale): void }`.
The walkthrough selector asks before changing language, and `DemoApp` restarts with the new
locale as its React key. The marketplace applies the new language directly and retains the
current screen and form. The provider keeps the locale in the URL during same-document
browser history navigation.

## Migration conventions
Register user-facing strings in the applicable JSON array under `site/i18n/messages/`. Marketplace
sources that the walkthrough and site do not share go in `product.json`. These inventories include
selector and recovery copy. Preserve English source exactly to retain existing tests. Screens
use `useI18n().t`. Pure functions receive a locale that defaults to English, or a translator.
Translate seed content at initialization and keep user-entered text as written. Parameterized
sources use `{0}` slots.

Static HTML uses explicit localization markers, and dynamic JavaScript invokes the shared translator. Preserve simulator model IDs and ledger source records.

Native AgentBrief accepts only canonical locale values; omission defaults to English. No arbitrary locale string enters prompt instructions.
