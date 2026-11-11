import { useState } from "react";
import { formatUsd } from "../domain/money";
import { formatRange } from "../domain/price";
import { proposalTotal, validateProposal } from "../domain/proposal";
import { currentMatch } from "../state/reducer";
import { NoticeLine, type ScreenProps, parseDollars } from "./shared";

const LENGTHS = [1, 2, 3, 4] as const;

/** FR-019: Dev proposes length and price; a price outside the overlap is flagged before sending. */
export function ProposalScreen({ state, dispatch }: ScreenProps) {
  const { proposal } = state;
  const match = currentMatch(state);
  const [price, setPrice] = useState(String(proposal.pricePerUnit));

  if (match.kind !== "match") {
    return (
      <div>
        <h2 tabIndex={-1}>Nobody to propose to yet</h2>
        <p className="lead">Go back to the match step to see why.</p>
      </div>
    );
  }

  const check = validateProposal(proposal.pricePerUnit, match.overlap);
  const total = proposalTotal(proposal.units, proposal.pricePerUnit);

  return (
    <div>
      <h2 tabIndex={-1}>Dev proposes a session to Margaret</h2>
      <p className="lead">The two of them agree the details. Nothing is booked until Margaret accepts.</p>

      <div className="field">
        <span id="length-label" style={{ fontWeight: 600 }}>
          Length
        </span>
        <div className="segmented" role="group" aria-labelledby="length-label">
          {LENGTHS.map((units) => (
            <button
              key={units}
              type="button"
              aria-pressed={proposal.units === units}
              onClick={() => dispatch({ type: "setProposalUnits", units })}
            >
              {units * 15} min
            </button>
          ))}
        </div>
      </div>

      <div className="field-row" style={{ marginTop: "var(--space-4)" }}>
        <div className="field">
          <label htmlFor="proposal-price">Price per 15 minutes ($), between {formatRange(match.overlap)}</label>
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
      <p className="big-price">
        Total: {check.ok ? formatUsd(total) : "—"} for {proposal.units * 15} minutes
      </p>

      <NoticeLine notice={state.notice} />

      <div className="actions">
        {proposal.sent ? (
          <p className="notice notice--info" role="status">
            Sent to Margaret. Waiting for her answer.
          </p>
        ) : (
          <button type="button" className="primary" onClick={() => dispatch({ type: "sendProposal" })}>
            Send proposal to Margaret
          </button>
        )}
      </div>
    </div>
  );
}
