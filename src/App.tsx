import { useEffect, useState } from "react";
import "./App.css";
import { toMessage } from "./lib/errors";
import { type AppInfo, getAppInfo } from "./lib/native";

export default function App() {
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
        <span className="brand">c0mpiler</span>
      </header>
      <main className="app-main">
        <h1 className="hero-title">Fifteen minutes to what matters next.</h1>
        <p className="lede">
          A short, guided conversation for adults approaching or enjoying
          retirement.
        </p>
        <button type="button" className="primary">
          Begin
        </button>
      </main>
      <footer className="app-footer">
        {error !== null
          ? `Native bridge error: ${error}`
          : info !== null
            ? `${info.name} v${info.version}`
            : `Web preview v${__APP_VERSION__}`}
      </footer>
    </div>
  );
}
