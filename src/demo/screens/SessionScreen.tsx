import { formatUsd } from "../domain/money";
import { formatSessionTime } from "../state/dates";
import type { ScreenProps } from "./shared";

/** FR-021, FR-022: confirmation, demo call link, payment held → released. */
export function SessionScreen({ state, dispatch }: ScreenProps) {
  const { session } = state;
  if (session === null) {
    return (
      <div>
        <h2 tabIndex={-1}>No session booked</h2>
      </div>
    );
  }
  const held = session.status === "held";

  return (
    <div>
      <h2 tabIndex={-1}>Session confirmed</h2>
      <div className="cards">
        <div className="card">
          <p className="muted">When</p>
          <p>
            <strong>{formatSessionTime(session.startsAt)}</strong>
          </p>
          <p>{session.units * 15} minutes</p>
        </div>
        <div className="card">
          <p className="muted">Price</p>
          <p>
            <strong>{formatUsd(session.total)}</strong> ({session.units} × {formatUsd(session.pricePerUnit)})
          </p>
        </div>
        <div className="card">
          <p className="muted">{session.call.provider}</p>
          <p style={{ overflowWrap: "anywhere" }}>{session.call.url}</p>
          <span className="badge badge--demo">Demo link — not a real meeting</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--space-4)" }}>
        <p className="muted">Payment (demo — no money moves)</p>
        <p role="status">
          <strong>{held ? "Released to Margaret" : "Payment held until the session takes place"}</strong>
        </p>
      </div>

      {!held && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "markSessionHeld" })}>
            Mark the session as held
          </button>
        </div>
      )}
    </div>
  );
}
