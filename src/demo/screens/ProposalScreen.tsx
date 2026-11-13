import { useI18n } from "../../i18n";
import { useState } from "react";
import { formatUsd } from "../domain/money";
import { formatRange } from "../domain/price";
import { proposalTotal, validateProposal } from "../domain/proposal";
import { currentMatch } from "../state/reducer";
import { NoticeLine, type ScreenProps, parseDollars } from "./shared";

const LENGTHS = [1, 2, 3, 4] as const;

/** FR-019: Dev proposes length and price; a price outside the overlap is flagged before sending. */
export function ProposalScreen({ state, dispatch }: ScreenProps) {
  const { t, locale } = useI18n();

  const { proposal } = state;
  const match = currentMatch(state);
  const [price, setPrice] = useState(String(proposal.pricePerUnit));

  if (match.kind !== "match") {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Nobody to propose to yet")}</h2>
        <p className="lead">{t("Go back to the match step to see why.")}</p>
      </div>
    );
  }

  const check = validateProposal(proposal.pricePerUnit, match.overlap, locale);
  const total = proposalTotal(proposal.units, proposal.pricePerUnit);

  return (
    <div>
      <h2 tabIndex={-1}>{t("Dev proposes a session to Margaret")}</h2>
      <p className="lead">{t("The two of them agree the details. Nothing is booked until Margaret accepts.")}</p>

      <div className="field">
        <span id="length-label" style={{ fontWeight: 600 }}>{t("Length")}</span>
        <div className="segmented" role="group" aria-labelledby="length-label">
          {LENGTHS.map((units) => (
            <button
              key={units}
              type="button"
              aria-pressed={proposal.units === units}
              onClick={() => dispatch({ type: "setProposalUnits", units })}
            >{t("{0} min", units * 15)}</button>
          ))}
        </div>
      </div>

      <div className="field-row" style={{ marginTop: "var(--space-4)" }}>
        <div className="field">
          <label htmlFor="proposal-price">{t("Price per 15 minutes ($), between {0}", formatRange(match.overlap, locale))}</label>
          <input
            id="proposal-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              dispatch({ type: "setProposalPrice", pricePerUnit: parseDollars(e.target.value) });
            }}
          />
        </div>
      </div>

      {!check.ok && (
        <p className="notice notice--error" role="alert">
          {check.message}
        </p>
      )}
      <p className="big-price">{t("Total: {0} for {1} minutes", check.ok ? formatUsd(total, locale) : t("—"), proposal.units * 15)}</p>

      <NoticeLine notice={state.notice} />

      <div className="actions">
        {proposal.sent ? (
          <p className="notice notice--info" role="status">{t("Sent to Margaret. Waiting for her answer.")}</p>
        ) : (
          <button type="button" className="primary" onClick={() => dispatch({ type: "sendProposal" })}>{t("Send proposal to Margaret")}</button>
        )}
      </div>
    </div>
  );
}
