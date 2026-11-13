export type Locale = "en" | "fr" | "es" | "de" | "it" | "zh-Hans" | "ko" | "ja" | "da" | "uk" | "pl" | "ro" | "nb" | "fi" | "id" | "tl" | "ta" | "hi";
export interface Language { readonly id: Locale; readonly label: string; readonly intl: string; }
export type Translator = (source: string, ...values: readonly (string | number)[]) => string;
export const LOCALES: readonly Language[];
export function resolveLocale(preferences: readonly string[]): Locale;
export function initialLocale(): Locale;
export function saveLocale(locale: Locale): void;
export function interpolate(message: string, values: readonly (string | number)[]): string;
export function messageSlots(message: string): string[];
export function createTranslator(locale: Locale): Translator;
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string;
export function formatMoney(value: number, locale: Locale, digits?: number): string;
export function formatDate(value: Date, locale: Locale, options?: Intl.DateTimeFormatOptions): string;
export function formatList(values: readonly string[], locale: Locale): string;
export function pluralCategory(count: number, locale: Locale): Intl.LDMLPluralRule;
