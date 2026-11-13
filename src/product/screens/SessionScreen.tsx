import { useEffect, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { sessionIcs } from "../calendar/ics";
import { formatCents } from "../model/money";
import { formatWhen, lengthText } from "../model/times";
import { type SessionView, mySession } from "../usecases/booking";
import { cancelSession, markSessionHeld } from "../usecases/session";
import { type ScreenProps, StandIn } from "./shared";

const HEADINGS = { upcoming: "Session confirmed", awaiting: "Waiting to be marked as held", held: "Session held", cancelled: "Session cancelled" } as const;

/** Stories 3 and 4: one session, for its buyer and its expert only (FR-004, FR-017, FR-018). */
export function SessionScreen({ ctx, account, params }: ScreenProps) {
  const [view, setView] = useState<SessionView | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void mySession(ctx, params.id ?? "").then((result) => setView(result.ok ? result.value : null));
  }, [ctx, params.id]);

  if (view === undefined) return <p className="lead">Opening your session…</p>;
  if (view === null) {
    return (
      <div>
        <h2 tabIndex={-1}>Session</h2>
        <p className="lead">This session isn't yours, or it doesn't exist.</p>
      </div>
    );
  }

  const { session, payment, phase } = view;
  const isExpert = session.expertId === account.id;
  const other = isExpert ? view.buyerName : view.expertName;
  const amount = formatCents(payment.amountCents);
  const ics = sessionIcs({
    uid: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    stampedAt: session.startsAt,
    summary: `Agely session: ${view.buyerName} and ${view.expertName}`,
    description: `${view.problem}\nMeeting link: ${session.meeting.url}`,
    url: session.meeting.url,
  });

  const act = async (run: () => Promise<{ ok: true; value: SessionView } | { ok: false; error: string }>, failed: string) => {
    const result = await run();
    if (result.ok) {
      setView(result.value);
      setError(null);
    } else {
      setError(failed);
    }
    setCancelling(false);
  };

  return (
    <div>
      <h2 tabIndex={-1}>{HEADINGS[phase]}</h2>
      <p className="lead">With {other}</p>
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <dl className="facts-list">
        <div>
          <dt>When, in your time zone</dt>
          <dd>{formatWhen(session.startsAt)}</dd>
        </div>
        <div>
          <dt>Length and price</dt>
          <dd>
            {lengthText(view.units)} at {formatUsd(view.pricePerUnit)} per 15 minutes
          </dd>
        </div>
        <div>
          <dt>About</dt>
          <dd>{view.problem}</dd>
        </div>
      </dl>

      <h3>Payment</h3>
      <StandIn ctx={ctx} service="payments">
        <p>
          <strong>
            {payment.state === "held" && `${amount} is held until the session has taken place.`}
            {payment.state === "released" && `${amount} was released. ${view.expertName} is owed ${formatCents(payment.owedCents)} after Agely's fee of ${formatCents(payment.feeCents)}.`}
            {payment.state === "lifted" && `The hold on ${amount} was lifted. Nothing was charged.`}
          </strong>
        </p>
      </StandIn>

      {phase === "upcoming" && (
        <>
          <h3>Where to meet</h3>
          <StandIn ctx={ctx} service="meetings">
            <p>
              <a href={session.meeting.url}>Open the meeting link</a>
            </p>
          </StandIn>
          <div className="actions">
            <a className="button-link" href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`} download="agely-session.ics">
              Add to my calendar
            </a>
          </div>
          {isExpert && <p className="muted">You can mark the session as held after it ends.</p>}
          {!cancelling ? (
            <div className="actions">
              <button type="button" className="quiet" onClick={() => setCancelling(true)}>
                Cancel this session
              </button>
            </div>
          ) : (
            <div className="card">
              <p>Cancelling lifts the hold on the payment, and the buyer is not charged. It cannot be undone.</p>
              <div className="actions">
                <button type="button" className="danger" onClick={() => void act(() => cancelSession(ctx, session.id), "This session can no longer be cancelled because it has started.")}>
                  Yes, cancel it
                </button>
                <button type="button" className="secondary" onClick={() => setCancelling(false)}>
                  Keep the session
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "awaiting" &&
        (isExpert ? (
          <div className="actions">
            <button type="button" className="primary" onClick={() => void act(() => markSessionHeld(ctx, session.id), "This session could not be marked as held.")}>
              The session took place
            </button>
          </div>
        ) : (
          <p className="notice notice--info">{view.expertName} confirms that the session took place. The payment stays held until then.</p>
        ))}
    </div>
  );
}
