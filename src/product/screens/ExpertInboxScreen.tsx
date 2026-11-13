import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { formatCents } from "../model/money";
import { formatWhen, lengthText } from "../model/times";
import { type ProposalView, acceptProposal, declineProposal, myProposals } from "../usecases/booking";
import { type ScreenProps, StandIn } from "./shared";

const ACCEPT_ERRORS: Record<string, string> = {
  "payment-failed": "The booking did not go through: the buyer's payment could not be held. Nothing is booked. You can try again once they have fixed it.",
  "price-outside-range": "This price is no longer inside the range you and the buyer share, because your price or their budget changed. Decline it and they can propose again.",
  "time-in-past": "The time proposed has already passed. Decline it and the buyer can propose another.",
  "time-taken": "You already have a session at that time.",
};

/** Story 3: the expert accepts or declines. Only these buttons do either (FR-014). */
export function ExpertInboxScreen({ ctx, account, go }: ScreenProps) {
  const [waiting, setWaiting] = useState<readonly ProposalView[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await myProposals(ctx);
    setWaiting(all.ok ? all.value.filter((p) => p.proposal.expertId === account.id && p.proposal.state === "waiting") : []);
  }, [ctx, account.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAccept(id: string) {
    const accepted = await acceptProposal(ctx, id);
    if (accepted.ok) go("session", { id: accepted.value.session.id });
    else setError(ACCEPT_ERRORS[accepted.error] ?? "This proposal could not be accepted.");
  }

  async function onDecline(id: string) {
    await declineProposal(ctx, id);
    setError(null);
    await load();
  }

  if (waiting === undefined) return <p className="lead">Opening your inbox…</p>;

  return (
    <div>
      <h2 tabIndex={-1}>Proposals for you</h2>
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {waiting.length === 0 ? (
        <p className="lead">You have no proposals waiting.</p>
      ) : (
        <>
          <p className="notice notice--info">Nothing is booked or charged until you accept.</p>
          <StandIn ctx={ctx} service="payments" />
          <div className="cards">
            {waiting.map((view) => (
              <div className="card" key={view.proposal.id}>
                <h3>{view.buyerName}</h3>
                <p>
                  {lengthText(view.proposal.units)} at {formatUsd(view.proposal.pricePerUnit)} per 15 minutes, {formatCents(view.totalCents)} in total.
                </p>
                <p>{formatWhen(view.proposal.startsAt)}</p>
                <p className="muted">Their problem: {view.problem}</p>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => void onAccept(view.proposal.id)}>
                    Accept
                  </button>
                  <button type="button" className="secondary" onClick={() => void onDecline(view.proposal.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
