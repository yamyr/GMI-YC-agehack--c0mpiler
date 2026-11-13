import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./ui/AppErrorBoundary";
import { I18nProvider } from "./i18n";

const root = document.getElementById("root");
if (root === null) throw new Error("root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <I18nProvider><App /></I18nProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
