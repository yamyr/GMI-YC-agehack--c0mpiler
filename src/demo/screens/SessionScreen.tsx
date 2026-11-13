import { useI18n } from "../../i18n";
import { formatUsd } from "../domain/money";
import { formatSessionTime } from "../state/dates";
import type { ScreenProps } from "./shared";

/** FR-021, FR-022: confirmation, demo call link, payment held → released. */
export function SessionScreen({ state, dispatch }: ScreenProps) {
  const { t, locale } = useI18n();

  const { session } = state;
  if (session === null) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("No session booked")}</h2>
      </div>
    );
  }
  const held = session.status === "held";

  return (
    <div>
      <h2 tabIndex={-1}>{t("Session confirmed")}</h2>
      <div className="cards">
        <div className="card">
          <p className="muted">{t("When")}</p>
          <p>
            <strong>{formatSessionTime(session.startsAt, locale)}</strong>
          </p>
          <p>{t("{0} minutes", session.units * 15)}</p>
        </div>
        <div className="card">
          <p className="muted">{t("Price")}</p>
          <p>{t("{0} ({1} × {2})", formatUsd(session.total, locale), session.units, formatUsd(session.pricePerUnit, locale))}</p>
        </div>
        <div className="card">
          <p className="muted">{session.call.provider}</p>
          <p style={{ overflowWrap: "anywhere" }}>{session.call.url}</p>
          <span className="badge badge--demo">{t("Demo link — not a real meeting")}</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: "var(--space-4)" }}>
        <p className="muted">{t("Payment (demo — no money moves)")}</p>
        <p role="status">
          <strong>{held ? t("Released to Margaret") : t("Payment held until the session takes place")}</strong>
        </p>
      </div>

      {!held && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "markSessionHeld" })}>{t("Mark the session as held")}</button>
        </div>
      )}
    </div>
  );
}
