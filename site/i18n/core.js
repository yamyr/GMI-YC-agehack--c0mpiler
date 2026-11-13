import { catalogs } from "./catalogs/index.js";

/** The language registry is shared by the app, website and catalog audit. */
export const LOCALES = Object.freeze([
  { id: "en", label: "English", intl: "en-US" },
  { id: "fr", label: "Français", intl: "fr-FR" },
  { id: "es", label: "Español", intl: "es-ES" },
  { id: "de", label: "Deutsch", intl: "de-DE" },
  { id: "it", label: "Italiano", intl: "it-IT" },
  { id: "zh-Hans", label: "简体中文", intl: "zh-CN" },
  { id: "ko", label: "한국어", intl: "ko-KR" },
  { id: "ja", label: "日本語", intl: "ja-JP" },
  { id: "da", label: "Dansk", intl: "da-DK" },
  { id: "uk", label: "Українська", intl: "uk-UA" },
  { id: "pl", label: "Polski", intl: "pl-PL" },
  { id: "ro", label: "Română", intl: "ro-RO" },
  { id: "nb", label: "Norsk bokmål", intl: "nb-NO" },
  { id: "fi", label: "Suomi", intl: "fi-FI" },
  { id: "id", label: "Bahasa Indonesia", intl: "id-ID" },
  { id: "tl", label: "Tagalog", intl: "fil-PH" },
  { id: "ta", label: "தமிழ்", intl: "ta-IN" },
  { id: "hi", label: "हिन्दी", intl: "hi-IN" },
]);

function supportedLocale(input) {
  if (typeof input !== "string" || input.trim() === "") return null;
  try {
    const parsed = new Intl.Locale(input.trim());
    if (parsed.language === "zh") {
      if (parsed.script === "Hant" || ["TW", "HK", "MO"].includes(parsed.region)) return null;
      return "zh-Hans";
    }
    const language = parsed.language === "no" ? "nb" : parsed.language === "fil" ? "tl" : parsed.language;
    return LOCALES.find(({ id }) => id === language)?.id ?? null;
  } catch {
    return null;
  }
}

export function resolveLocale(preferences) {
  for (const preference of preferences) {
    const supported = supportedLocale(preference);
    if (supported !== null) return supported;
  }
  return "en";
}

export function initialLocale() {
  if (typeof window === "undefined") return "en";
  const explicit = new URLSearchParams(window.location?.search ?? "").get("lang");
  let saved = null;
  try {
    saved = window.localStorage.getItem("agely.locale");
  } catch {
    // Private browsing or host policy can disable storage; language selection still works.
  }
  const browser = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
  return resolveLocale([explicit, saved, ...browser]);
}

export function saveLocale(locale) {
  try {
    window.localStorage.setItem("agely.locale", locale);
  } catch {
    // A preference must never prevent someone from using the app.
  }
}

export function interpolate(message, values) {
  return message.replace(/\{(\d+)\}/g, (slot, index) => values[Number(index)] === undefined ? slot : String(values[Number(index)]));
}

export function messageSlots(message) {
  return [...new Set(message.match(/\{\d+\}/g) ?? [])].sort();
}

export function createTranslator(locale) {
  const catalog = catalogs[locale] ?? {};
  return (source, ...values) => {
    const candidate = Object.hasOwn(catalog, source) ? catalog[source] : null;
    // A malformed draft must never lose an amount, a person's name, or an action label.
    const message = typeof candidate === "string" && candidate.trim() !== "" &&
      messageSlots(candidate).join() === messageSlots(source).join() ? candidate : source;
    return interpolate(message, values);
  };
}

function intlLocale(locale) {
  return LOCALES.find(({ id }) => id === locale)?.intl ?? "en-US";
}

export function formatNumber(value, locale, options = {}) {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}

export function formatMoney(value, locale, digits = 0) {
  return formatNumber(value, locale, { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDate(value, locale, options = {}) {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(value);
}

export function formatList(values, locale) {
  return new Intl.ListFormat(intlLocale(locale), { style: "long", type: "conjunction" }).format(values);
}

export function pluralCategory(count, locale) {
  return new Intl.PluralRules(intlLocale(locale)).select(count);
}
