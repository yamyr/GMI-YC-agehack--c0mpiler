import { LOCALES } from "../site/i18n/core.js";

// The default covers Latin, Cyrillic, CJK and Indian scripts without running every locale in CI.
const DEFAULT_LANGUAGES = ["en", "de", "fi", "zh-Hans", "uk", "ta", "hi"];

export function siteCheckLanguages(filter) {
  if (filter === undefined) return DEFAULT_LANGUAGES;
  if (!LOCALES.some(({ id }) => id === filter)) throw new Error("Unknown language filter");
  return [filter];
}

export function localizedUrl(base, path, language) {
  const url = new URL(path, base);
  url.searchParams.set("lang", language);
  return url.href;
}
