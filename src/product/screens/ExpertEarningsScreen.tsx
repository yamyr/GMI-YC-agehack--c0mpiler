import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { formatCents } from "../model/money";
import { formatWhen } from "../model/times";
import { type Earnings, myEarnings } from "../usecases/session";
import { type ScreenProps, StandIn } from "./shared";

/** Story 4: what the expert is owed, with price, fee and amount owed shown separately (FR-019). */
export function ExpertEarningsScreen({ ctx }: ScreenProps) {
  const { locale, t } = useI18n();
  const [earnings, setEarnings] = useState<Earnings | null | undefined>(undefined);

  useEffect(() => {
    void myEarnings(ctx).then((result) => setEarnings(result.ok ? result.value : null));
  }, [ctx]);

  if (earnings == null) return <p className="lead">{t(earnings === undefined ? "Opening your earnings…" : "You are not signed in.")}</p>;

  return (
    <div>
      <h2 tabIndex={-1}>{t("Your earnings")}</h2>
      {earnings.released.length === 0 ? (
        <p className="lead">{t("Nothing has been released to you yet.")}</p>
      ) : (
        <>
          <p className="big-price">{t("You are owed {0}.", formatCents(earnings.owedCents, locale))}</p>
          <div className="table-scroll" tabIndex={0} role="region" aria-label={t("Sessions you have been paid for")}>
            <table className="earnings">
              <thead>
                <tr>
                  <th scope="col">{t("Session")}</th>
                  <th scope="col">{t("Buyer paid")}</th>
                  <th scope="col">{t("Agely's fee")}</th>
                  <th scope="col">{t("You are owed")}</th>
                </tr>
              </thead>
              <tbody>
                {earnings.released.map((view) => (
                  <tr key={view.session.id}>
                    <th scope="row">
                      {view.buyerName ?? t("Deleted account")}
                      <span className="muted"> {formatWhen(view.session.startsAt, locale)}</span>
                    </th>
                    <td>{formatCents(view.payment.amountCents, locale)}</td>
                    <td>{formatCents(view.payment.feeCents, locale)}</td>
                    <td>{formatCents(view.payment.owedCents, locale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t("Total")}</th>
                  <td>{formatCents(earnings.paidCents, locale)}</td>
                  <td>{formatCents(earnings.feeCents, locale)}</td>
                  <td>{formatCents(earnings.owedCents, locale)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
      {earnings.pendingCents > 0 && <p>{t("{0} is held for sessions that have not been marked as held.", formatCents(earnings.pendingCents, locale))}</p>}
      <p className="notice notice--info">{t("Payouts are made by hand in this version. Nothing has been sent to you.")}</p>
      <StandIn ctx={ctx} service="payments" />
    </div>
  );
}
