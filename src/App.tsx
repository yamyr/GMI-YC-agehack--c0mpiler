import { useEffect, useState } from "react";
import "./App.css";
import { DemoApp } from "./demo/DemoApp";
import { LanguageSelector, useI18n } from "./i18n";
import { toMessage } from "./lib/errors";
import { type AppInfo, getAppInfo } from "./lib/native";

export default function App() {
  const { locale, t } = useI18n();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAppInfo()
      .then((next) => {
        if (!cancelled) setInfo(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(toMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="brand">Agely</h1>
      </header>
      <main className="app-main">
        <LanguageSelector />
        <DemoApp key={locale} />
      </main>
      <footer className="app-footer">
        {error !== null
          ? t("Native bridge error: {0}", error)
          : info !== null
            ? `${info.name} v${info.version}`
            : t("Web preview v{0}", __APP_VERSION__)}
      </footer>
    </div>
  );
}
