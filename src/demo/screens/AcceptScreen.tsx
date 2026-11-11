import { formatUsd } from "../domain/money";
import { proposalTotal } from "../domain/proposal";
import type { ScreenProps } from "./shared";

/** FR-020: Margaret accepts or declines; nothing is booked or charged before she accepts. */
export function AcceptScreen({ state, dispatch }: ScreenProps) {
  const { proposal, brief, session } = state;
  const total = proposalTotal(proposal.units, proposal.pricePerUnit);

  return (
    <div>
      <h2 tabIndex={-1}>Dev would like a session with Margaret</h2>
      <div className="card">
        <p>
          <strong>Dev Patel</strong> asks for <strong>{proposal.units * 15} minutes</strong> at{" "}
          <strong>{formatUsd(proposal.pricePerUnit)} per 15 minutes</strong>: {formatUsd(total)} in total.
        </p>
        <p className="muted">“{brief.problem}”</p>
      </div>
      {session === null ? (
        <>
          <p className="notice notice--info">Nothing is booked or charged until Margaret accepts.</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => dispatch({ type: "acceptProposal" })}>
              Accept
            </button>
            <button type="button" className="secondary" onClick={() => dispatch({ type: "declineProposal" })}>
              Decline
            </button>
          </div>
        </>
      ) : (
        <p className="notice notice--info" role="status">
          Margaret accepted.
        </p>
      )}
    </div>
  );
}
