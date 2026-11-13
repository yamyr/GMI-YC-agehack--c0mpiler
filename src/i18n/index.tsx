import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator, initialLocale, LOCALES, saveLocale, type Locale, type Translator } from "../../site/i18n/core.js";

interface I18n {
  readonly locale: Locale;
  readonly t: Translator;
  readonly setLocale: (locale: Locale) => void;
}

const Context = createContext<I18n>({ locale: "en", t: createTranslator("en"), setLocale: () => {} });

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const value = useMemo<I18n>(() => ({ locale, t: createTranslator(locale), setLocale: updateLocale }), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    saveLocale(locale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState(null, "", url);
  }, [locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n { return useContext(Context); }

/** Locale changes always start a fresh story; cancellation never touches demo state. */
export function LanguageSelector() {
  const { locale, t, setLocale } = useI18n();
  const [proposed, propose] = useState<Locale | null>(null);
  return <div className="language-settings">
    <label htmlFor="language">{t("Language")}</label>
    <select id="language" name="language" value={proposed ?? locale} onChange={(event) => {
      const next = LOCALES.find((entry) => entry.id === event.target.value);
      if (next !== undefined) propose(next.id === locale ? null : next.id);
    }}>
      {LOCALES.map((entry) => <option key={entry.id} value={entry.id} lang={entry.id}>{entry.label}</option>)}
    </select>
    {proposed !== null && <section className="language-confirmation" role="region" aria-label={t("Change language")}>
      <p>{t("Changing language restarts the walkthrough. Your edits and conversations will be cleared.")}</p>
      <div className="actions">
        <button className="primary" type="button" onClick={() => { setLocale(proposed); propose(null); }}>{t("Restart in this language")}</button>
        <button className="secondary" type="button" onClick={() => propose(null)}>{t("Keep current language")}</button>
      </div>
    </section>}
    {locale !== "en" && <p className="translation-notice" role="note">{t("Translations are machine-generated drafts. Missing translations appear in English. Please review before relying on them.")}</p>}
  </div>;
}
