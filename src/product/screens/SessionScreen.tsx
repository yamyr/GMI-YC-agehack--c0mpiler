import { useEffect, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { sessionIcs } from "../calendar/ics";
import { formatCents } from "../model/money";
import { formatWhen, lengthText } from "../model/times";
import { type SessionView, mySession } from "../usecases/booking";
import { type ScreenProps, StandIn } from "./shared";

/** Story 3: a confirmed session, for its buyer and its expert only (FR-004, FR-017). */
export function SessionScreen({ ctx, account, params }: ScreenProps) {
  const [view, setView] = useState<SessionView | null | undefined>(undefined);

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

  const { session, payment } = view;
  const other = session.buyerId === account.id ? view.expertName : view.buyerName;
  const ics = sessionIcs({
    uid: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    stampedAt: session.startsAt,
    summary: `Agely session: ${view.buyerName} and ${view.expertName}`,
    description: `${view.problem}\nMeeting link: ${session.meeting.url}`,
    url: session.meeting.url,
  });

  return (
    <div>
      <h2 tabIndex={-1}>Session confirmed</h2>
      <p className="lead">With {other}</p>
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
          <strong>{formatCents(payment.amountCents)} is held until the session has taken place.</strong>
        </p>
      </StandIn>

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
    </div>
  );
}
