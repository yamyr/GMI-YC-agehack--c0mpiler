import { LiveAgentPanel } from "../live/LiveAgentPanel";
import { useLiveAgent } from "../live/context";
import type { ScreenProps } from "./shared";

/** FR-001: introduces both people and says plainly that nothing is connected. */
export function StartScreen({ dispatch }: ScreenProps) {
  const { status, on } = useLiveAgent();
  const live = status.state === "ready" && on;
  return (
    <div>
      <h2 tabIndex={-1}>Experience shouldn't retire.</h2>
      <p className="lead">
        Agely is an expert network where older people sell decades of experience in 15-minute sessions. This
        walkthrough follows two fictional people from first conversation to first earnings.
      </p>
      <div className="cards">
        <div className="card">
          <h3>Margaret Okafor, 68</h3>
          <p>Retired procurement director from Columbus, Ohio. 34 years choosing suppliers and negotiating contracts.</p>
          <p className="muted">The expert</p>
        </div>
        <div className="card">
          <h3>Dev Patel</h3>
          <p>Hardware founder with a team of six, about to sign his first contract-manufacturing agreement.</p>
          <p className="muted">The buyer</p>
        </div>
      </div>
      <p className="notice notice--info">
        {live
          ? "All data is scripted except the three conversations, which come from a live agent. No payments or calendars are connected."
          : "All data is scripted. No agents, payments or calendars are connected."}{" "}
        People make every decision; agents only suggest.
      </p>
      <LiveAgentPanel />
      <div className="actions">
        <button type="button" className="primary" onClick={() => dispatch({ type: "next" })}>
          Start the walkthrough
        </button>
      </div>
    </div>
  );
}
