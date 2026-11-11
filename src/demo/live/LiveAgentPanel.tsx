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
  const { status, on, setOn, recheck } = useLiveAgent();
  const ready = status.state === "ready";
  const live = ready && on;

  return (
    <section className="card live-panel" aria-label="Live agent">
      <h3 style={{ marginTop: 0 }}>{ready && !on ? "Live agent: ready, turned off" : HEADLINES[status.state]}</h3>
      <p role="status">{status.detail}</p>
      {live && (
        <p className="muted">
          The three conversations are generated live{status.model !== null ? ` with ${status.model}` : ""}. Their text
          is sent to OpenAI through the ChatGPT account signed in to Codex on this computer. No API key is used.
        </p>
      )}
      {!ready && status.state !== "checking" && (
        <p className="muted">The walkthrough uses the scripted conversations.</p>
      )}
      {status.fix !== null && (
        <p>
          <strong>To fix:</strong> {status.fix}
        </p>
      )}
      <div className="actions" style={{ marginTop: "var(--space-3)" }}>
        {ready && (
          <button type="button" className="secondary" aria-pressed={on} onClick={() => setOn(!on)}>
            {on ? "Turn live agent off" : "Turn live agent on"}
          </button>
        )}
        {status.state !== "checking" && status.state !== "unavailable" && (
          <button type="button" className="quiet" onClick={recheck}>
            Check again
          </button>
        )}
      </div>
    </section>
  );
}
