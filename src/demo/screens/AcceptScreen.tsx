import { useI18n } from "../../i18n";
import { formatUsd } from "../domain/money";
import { proposalTotal } from "../domain/proposal";
import type { ScreenProps } from "./shared";

/** FR-020: Margaret accepts or declines; nothing is booked or charged before she accepts. */
export function AcceptScreen({ state, dispatch }: ScreenProps) {
  const { t, locale } = useI18n();

  const { proposal, brief, session } = state;
  const total = proposalTotal(proposal.units, proposal.pricePerUnit);

  return (
    <div>
      <h2 tabIndex={-1}>{t("Dev would like a session with Margaret")}</h2>
      <div className="card">
        <p>{t("Dev Patel asks for {0} minutes at {1} per 15 minutes: {2} in total.", proposal.units * 15, formatUsd(proposal.pricePerUnit, locale), formatUsd(total, locale))}</p>
        <p className="muted">{t("“{0}”", brief.problem)}</p>
      </div>
      {session === null ? (
        <>
          <p className="notice notice--info">{t("Nothing is booked or charged until Margaret accepts.")}</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => dispatch({ type: "acceptProposal" })}>{t("Accept")}</button>
            <button type="button" className="secondary" onClick={() => dispatch({ type: "declineProposal" })}>{t("Decline")}</button>
          </div>
        </>
      ) : (
        <p className="notice notice--info" role="status">{t("Margaret accepted.")}</p>
      )}
    </div>
  );
}
