import { useEffect, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { useI18n } from "../../i18n";
import { sessionIcs } from "../calendar/ics";
import { formatCents } from "../model/money";
import { formatWhen, lengthText } from "../model/times";
import { type SessionView, mySession } from "../usecases/booking";
import { cancelSession, markSessionHeld } from "../usecases/session";
import { type ScreenProps, StandIn } from "./shared";

/** Stories 3 and 4: one session, for its buyer and its expert only (FR-004, FR-017, FR-018). */
export function SessionScreen({ ctx, account, params }: ScreenProps) {
  const { locale, t } = useI18n();
  const [view, setView] = useState<SessionView | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<"cancel" | "mark-held" | null>(null);

  useEffect(() => {
    void mySession(ctx, params.id ?? "").then((result) => setView(result.ok ? result.value : null));
  }, [ctx, params.id]);

  if (view === undefined) return <p className="lead">{t("Opening your session…")}</p>;
  if (view === null) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Session")}</h2>
        <p className="lead">{t("This session isn't yours, or it doesn't exist.")}</p>
      </div>
    );
  }

  const { session, payment, phase } = view;
  const isExpert = session.expertId === account.id;
  const buyer = view.buyerName ?? t("Deleted account");
  const expert = view.expertName ?? t("Deleted account");
  const other = isExpert ? buyer : expert;
  const amount = formatCents(payment.amountCents, locale);
  const headings: Record<typeof phase, string> = {
    upcoming: t("Session confirmed"),
    awaiting: t("Waiting to be marked as held"),
    held: t("Session held"),
    cancelled: t("Session cancelled"),
  };
  const ics = sessionIcs({
    uid: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    stampedAt: session.startsAt,
    summary: t("Agely session: {0} and {1}", buyer, expert),
    description: `${view.problem}\n${t("Meeting link: {0}", session.meeting.url)}`,
    url: session.meeting.url,
  });

  const act = async (run: () => Promise<{ ok: true; value: SessionView } | { ok: false; error: string }>, failed: NonNullable<typeof error>) => {
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
      <h2 tabIndex={-1}>{headings[phase]}</h2>
      <p className="lead">{t("With {0}", other)}</p>
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {t(error === "cancel" ? "This session can no longer be cancelled because it has started." : "This session could not be marked as held.")}
        </p>
      )}
      <dl className="facts-list">
        <div>
          <dt>{t("When, in your time zone")}</dt>
          <dd>{formatWhen(session.startsAt, locale)}</dd>
        </div>
        <div>
          <dt>{t("Length and price")}</dt>
          <dd>
            {t("{0} at {1} per 15 minutes", lengthText(view.units, locale), formatUsd(view.pricePerUnit, locale))}
          </dd>
        </div>
        <div>
          <dt>{t("About")}</dt>
          <dd>{view.problem}</dd>
        </div>
      </dl>

      <h3>{t("Payment")}</h3>
      <StandIn ctx={ctx} service="payments">
        <p>
          <strong>
            {payment.state === "held" && t("{0} is held until the session has taken place.", amount)}
            {payment.state === "released" && t("{0} was released. {1} is owed {2} after Agely's fee of {3}.", amount, expert, formatCents(payment.owedCents, locale), formatCents(payment.feeCents, locale))}
            {payment.state === "lifted" && t("The hold on {0} was lifted. Nothing was charged.", amount)}
          </strong>
        </p>
      </StandIn>

      {phase === "upcoming" && (
        <>
          <h3>{t("Where to meet")}</h3>
          <StandIn ctx={ctx} service="meetings">
            <p>
              <a href={session.meeting.url}>{t("Open the meeting link")}</a>
            </p>
          </StandIn>
          <div className="actions">
            <a className="button-link" href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`} download="agely-session.ics">
              {t("Add to my calendar")}
            </a>
          </div>
          {isExpert && <p className="muted">{t("You can mark the session as held after it ends.")}</p>}
          {!cancelling ? (
            <div className="actions">
              <button type="button" className="quiet" onClick={() => setCancelling(true)}>
                {t("Cancel this session")}
              </button>
            </div>
          ) : (
            <div className="card">
              <p>{t("Cancelling lifts the hold on the payment, and the buyer is not charged. It cannot be undone.")}</p>
              <div className="actions">
                <button type="button" className="danger" onClick={() => void act(() => cancelSession(ctx, session.id), "cancel")}>
                  {t("Yes, cancel it")}
                </button>
                <button type="button" className="secondary" onClick={() => setCancelling(false)}>
                  {t("Keep the session")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {phase === "awaiting" &&
        (isExpert ? (
          <div className="actions">
            <button type="button" className="primary" onClick={() => void act(() => markSessionHeld(ctx, session.id), "mark-held")}>
              {t("The session took place")}
            </button>
          </div>
        ) : (
          <p className="notice notice--info">{t("{0} confirms that the session took place. The payment stays held until then.", expert)}</p>
        ))}
    </div>
  );
}
