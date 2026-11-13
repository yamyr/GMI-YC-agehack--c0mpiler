import { useCallback, useEffect, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { useI18n } from "../../i18n";
import { formatCents } from "../model/money";
import { formatWhen, lengthText } from "../model/times";
import { type ProposalView, acceptProposal, declineProposal, myProposals } from "../usecases/booking";
import { type ScreenProps, StandIn } from "./shared";

type AcceptError = Extract<Awaited<ReturnType<typeof acceptProposal>>, { ok: false }>["error"];

/** Story 3: the expert accepts or declines. Only these buttons do either (FR-014). */
export function ExpertInboxScreen({ ctx, account, go }: ScreenProps) {
  const { locale, t } = useI18n();
  const [waiting, setWaiting] = useState<readonly ProposalView[] | undefined>(undefined);
  const [error, setError] = useState<AcceptError | null>(null);

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
    else setError(accepted.error);
  }

  async function onDecline(id: string) {
    await declineProposal(ctx, id);
    setError(null);
    await load();
  }

  if (waiting === undefined) return <p className="lead">{t("Opening your inbox…")}</p>;

  function acceptErrorMessage(failure: AcceptError): string {
    switch (failure) {
      case "payment-failed":
        return t("The booking did not go through: the buyer's payment could not be held. Nothing is booked. You can try again once they have fixed it.");
      case "price-outside-range":
        return t("This price is no longer inside the range you and the buyer share, because your price or their budget changed. Decline it and they can propose again.");
      case "time-in-past":
        return t("The time proposed has already passed. Decline it and the buyer can propose another.");
      case "time-taken":
        return t("You already have a session at that time.");
      default:
        return t("This proposal could not be accepted.");
    }
  }

  return (
    <div>
      <h2 tabIndex={-1}>{t("Proposals for you")}</h2>
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {acceptErrorMessage(error)}
        </p>
      )}
      {waiting.length === 0 ? (
        <p className="lead">{t("You have no proposals waiting.")}</p>
      ) : (
        <>
          <p className="notice notice--info">{t("Nothing is booked or charged until you accept.")}</p>
          <StandIn ctx={ctx} service="payments" />
          <div className="cards">
            {waiting.map((view) => (
              <div className="card" key={view.proposal.id}>
                <h3>{view.buyerName ?? t("Deleted account")}</h3>
                <p>
                  {t("{0} at {1} per 15 minutes, {2} in total.", lengthText(view.proposal.units, locale), formatUsd(view.proposal.pricePerUnit, locale), formatCents(view.totalCents, locale))}
                </p>
                <p>{formatWhen(view.proposal.startsAt, locale)}</p>
                <p className="muted">{t("Their problem: {0}", view.problem)}</p>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => void onAccept(view.proposal.id)}>
                    {t("Accept")}
                  </button>
                  <button type="button" className="secondary" onClick={() => void onDecline(view.proposal.id)}>
                    {t("Decline")}
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
