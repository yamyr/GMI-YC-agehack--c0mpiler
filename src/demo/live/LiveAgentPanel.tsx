import { useI18n } from "../../i18n";
import { useLiveAgent } from "./context";

const HEADLINES: Readonly<Record<string, string>> = {
  checking: "Live agent: checking…",
  ready: "Live agent: ready",
  not_installed: "Live agent: off — Codex is not installed",
  not_signed_in: "Live agent: off — Codex is not signed in",
  model_unavailable: "Live agent: off — no allowed model",
  unavailable: "Live agent: off in the browser preview",
  error: "Live agent: off — the check failed",
};

/** FR-001–FR-005, FR-018: readiness, model, privacy note, presenter switch and setup help. */
export function LiveAgentPanel() {
  const { t, locale } = useI18n();

  const { status, on, setOn, recheck } = useLiveAgent();
  const ready = status.state === "ready";
  const live = ready && on;

  // Native diagnostic text stays verbatim; recovery instructions use stable status codes.
  const localizedDetail = () => {
    switch (status.state) {
      case "checking": return t("Checking whether the live agent can run on this computer…");
      case "ready": return t("Live agent ready, using {0} through your Codex sign-in.", status.model ?? "Codex");
      case "not_installed": return t("Codex is not installed on this computer, so the scripted conversations are used.");
      case "not_signed_in": return t("Codex is installed but not signed in.");
      case "model_unavailable": return t("Your ChatGPT plan does not allow an available Codex model.");
      case "unavailable": return t("The live agent runs only in the desktop app; this browser preview uses the scripted conversations.");
      case "error": return t("The live agent check failed. The walkthrough uses scripted conversations.");
    }
  };
  const localizedFix = () => {
    switch (status.state) {
      case "not_installed": return t("Install it with: {0} — then select Check again.", "npm install -g @openai/codex");
      case "not_signed_in": return t("In a terminal run: {0} — sign in with ChatGPT, then select Check again.", "codex login");
      case "model_unavailable": return t("Set {0} to a model your plan allows, restart the app, then Check again.", "AGELY_CODEX_MODEL");
      case "unavailable": return t("Run {0} to use it.", "bun run tauri dev");
      default: return t("Check your internet connection, then select Check again.");
    }
  };

  return (
    <section className="card live-panel" aria-label={t("Live agent")}>
      <h3 style={{ marginTop: 0 }}>{ready && !on ? t("Live agent: ready, turned off") : t(HEADLINES[status.state] ?? "Live agent: off — the check failed")}</h3>
      <p role="status">{locale === "en" ? status.detail : localizedDetail()}</p>
      {live && (
        <p className="muted">{t("The three conversations are generated live{0}. Their text is sent to OpenAI through the ChatGPT account signed in to Codex on this computer. No API key is used.", status.model !== null ? t(" with {0}", status.model) : "")}</p>
      )}
      {!ready && status.state !== "checking" && (
        <p className="muted">{t("The walkthrough uses the scripted conversations.")}</p>
      )}
      {status.fix !== null && (
        <p>{t("To fix: {0}", locale === "en" ? status.fix : localizedFix())}</p>
      )}
      {locale !== "en" && (status.state === "error" || status.state === "model_unavailable") && <details><summary>{t("Technical details (original language)")}</summary><p>{status.detail}</p></details>}
      <div className="actions" style={{ marginTop: "var(--space-3)" }}>
        {ready && (
          <button type="button" className="secondary" aria-pressed={on} onClick={() => setOn(!on)}>
            {on ? t("Turn live agent off") : t("Turn live agent on")}
          </button>
        )}
        {status.state !== "checking" && status.state !== "unavailable" && (
          <button type="button" className="quiet" onClick={recheck}>{t("Check again")}</button>
        )}
      </div>
    </section>
  );
}
