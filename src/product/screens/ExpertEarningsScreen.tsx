import { useEffect, useState } from "react";
import { formatCents } from "../model/money";
import { formatWhen } from "../model/times";
import { type Earnings, myEarnings } from "../usecases/session";
import { type ScreenProps, StandIn } from "./shared";

/** Story 4: what the expert is owed, with price, fee and amount owed shown separately (FR-019). */
export function ExpertEarningsScreen({ ctx }: ScreenProps) {
  const [earnings, setEarnings] = useState<Earnings | null | undefined>(undefined);

  useEffect(() => {
    void myEarnings(ctx).then((result) => setEarnings(result.ok ? result.value : null));
  }, [ctx]);

  if (earnings == null) return <p className="lead">{earnings === undefined ? "Opening your earnings…" : "You are not signed in."}</p>;

  return (
    <div>
      <h2 tabIndex={-1}>Your earnings</h2>
      {earnings.released.length === 0 ? (
        <p className="lead">Nothing has been released to you yet.</p>
      ) : (
        <>
          <p className="big-price">You are owed {formatCents(earnings.owedCents)}.</p>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Sessions you have been paid for">
            <table className="earnings">
              <thead>
                <tr>
                  <th scope="col">Session</th>
                  <th scope="col">Buyer paid</th>
                  <th scope="col">Agely's fee</th>
                  <th scope="col">You are owed</th>
                </tr>
              </thead>
              <tbody>
                {earnings.released.map((view) => (
                  <tr key={view.session.id}>
                    <th scope="row">
                      {view.buyerName}
                      <span className="muted"> {formatWhen(view.session.startsAt)}</span>
                    </th>
                    <td>{formatCents(view.payment.amountCents)}</td>
                    <td>{formatCents(view.payment.feeCents)}</td>
                    <td>{formatCents(view.payment.owedCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>{formatCents(earnings.paidCents)}</td>
                  <td>{formatCents(earnings.feeCents)}</td>
                  <td>{formatCents(earnings.owedCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
      {earnings.pendingCents > 0 && <p>{formatCents(earnings.pendingCents)} is held for sessions that have not been marked as held.</p>}
      <p className="notice notice--info">Payouts are made by hand in this version. Nothing has been sent to you.</p>
      <StandIn ctx={ctx} service="payments" />
    </div>
  );
}
