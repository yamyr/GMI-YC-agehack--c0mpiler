import { useEffect, useState } from "react";
import "./App.css";
import { DemoApp } from "./demo/DemoApp";
import { LanguageSelector, useI18n } from "./i18n";
import { toMessage } from "./lib/errors";
import { type AppInfo, getAppInfo, isTauri } from "./lib/native";
import { ProductApp } from "./product/ProductApp";
import { PRODUCT_HASH, isProductRoute } from "./product/routes";

export default function App() {
  const { locale, t } = useI18n();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The signed-in product lives under #/app; everything else is the scripted walkthrough.
  const [hash, setHash] = useState(() => window.location.hash);
  const web = !isTauri();
  const product = web && isProductRoute(hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
        {/* The desktop app keeps the walkthrough only in this version (FR-025). */}
        {web && (
          <a className="app-switch" href={product ? "#/" : PRODUCT_HASH}>
            {t(product ? "Back to the walkthrough" : "Try the product")}
          </a>
        )}
      </header>
      <main className="app-main">
        <LanguageSelector key={product ? "product" : "walkthrough"} restartWalkthrough={!product} />
        {product ? <ProductApp /> : <DemoApp key={locale} />}
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
