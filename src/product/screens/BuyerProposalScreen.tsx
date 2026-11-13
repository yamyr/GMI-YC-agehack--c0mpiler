import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { formatRange, overlap, validateRange } from "../../demo/domain/price";
import { useI18n } from "../../i18n";
import { parseDollars } from "../../i18n/digits";
import { formatCents, sessionTotalCents } from "../model/money";
import { formatWhen, lengthText, suggestedTimes } from "../model/times";
import type { Brief } from "../model/types";
import { href } from "../routes";
import { type ProposalView, myProposals, sendProposal, withdrawProposal } from "../usecases/booking";
import { myCurrentBrief } from "../usecases/brief";
import { type MatchView, myMatch } from "../usecases/match";
import { type ScreenProps, StandIn } from "./shared";

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
type SendError = Extract<Awaited<ReturnType<typeof sendProposal>>, { ok: false }>["error"];

/** Story 3: the buyer proposes a length, a price inside the shared range and a time (FR-013). */
export function BuyerProposalScreen({ ctx, account, refresh }: ScreenProps) {
  const { locale, t } = useI18n();
  const [loaded, setLoaded] = useState<{ brief: Brief | null; view: MatchView | null; last: ProposalView | null } | undefined>(undefined);
  const [units, setUnits] = useState(2);
  const [priceText, setPriceText] = useState("");
  const [error, setError] = useState<
    | { readonly code: "price-outside-range" | "invalid-price"; readonly price: number }
    | { readonly code: Exclude<SendError, "price-outside-range"> | "missing-time" }
    | null
  >(null);
  const times = useMemo(() => suggestedTimes(ctx.now()), [ctx]);

  const load = useCallback(async () => {
    const current = await myCurrentBrief(ctx);
    const brief = current.ok ? current.value : null;
    const match = brief === null ? null : await myMatch(ctx, brief.id);
    const view = match !== null && match.ok ? match.value : null;
    const all = await myProposals(ctx);
    const mine = all.ok && brief !== null ? all.value.filter((p) => p.proposal.briefId === brief.id) : [];
    const last = mine.find((p) => p.proposal.state === "waiting" || p.proposal.state === "accepted") ?? mine[0] ?? null;
    setLoaded({ brief, view, last });
    if (brief !== null && view !== null && view.match.result.kind === "match") {
      setUnits(brief.units);
      setPriceText(String(Math.round((view.match.result.overlap.min + view.match.result.overlap.max) / 2)));
    }
  }, [ctx]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loaded === undefined) return <p className="lead">{t("Opening your proposal…")}</p>;
  const { brief, view, last } = loaded;
  const result = view?.match.result;

  if (brief === null || view === null || result === undefined || result.kind !== "match" || view.stale) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Propose a session")}</h2>
        <p className="lead">{t("You need a current match before you can propose a session.")}</p>
        <div className="actions">
          <a className="button-link" href={href("buyer-match")}>
            {t("See my match")}
          </a>
        </div>
      </div>
    );
  }

  const expertName = result.expert.name;
  const price = parseDollars(priceText);
  // The range in force now: the expert's own range may be wider than the budget.
  const shared = (result.expert.priceRange !== null ? overlap(result.expert.priceRange, brief.budget) : null) ?? result.overlap;

  if (last !== null && last.proposal.state === "waiting") {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Waiting for {0} to answer", expertName)}</h2>
        <p className="lead">
          {t("You proposed {0} at {1} per 15 minutes, {2} in total, on {3}.",
            lengthText(last.proposal.units, locale),
            formatUsd(last.proposal.pricePerUnit, locale),
            formatCents(last.totalCents, locale),
            formatWhen(last.proposal.startsAt, locale))}
        </p>
        <p className="notice notice--info">{t("Nothing is booked or charged until {0} accepts. They will see your proposal the next time they open Agely; nothing is sent to them.", expertName)}</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => void withdrawProposal(ctx, last.proposal.id).then(load)}>
            {t("Withdraw my proposal")}
          </button>
        </div>
      </div>
    );
  }

  if (last !== null && last.proposal.state === "accepted" && last.sessionId !== null) {
    return (
      <div>
        <h2 tabIndex={-1}>{t("{0} accepted", expertName)}</h2>
        <p className="lead">{t("Your session is confirmed.")}</p>
        <div className="actions">
          <a className="button-link" href={href("session", { id: last.sessionId })}>
            {t("See my session")}
          </a>
        </div>
      </div>
    );
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (brief === null) return;
    if (!validateRange({ min: price, max: price }).ok) return setError({ code: "invalid-price", price });
    const data = new FormData(event.currentTarget);
    const other = String(data.get("other") ?? "");
    const picked = String(data.get("when") ?? "");
    const startsAt = other !== "" ? new Date(other).toISOString() : picked;
    if (startsAt === "") return setError({ code: "missing-time" });
    const sent = await sendProposal(ctx, brief.id, { units, pricePerUnit: price, startsAt, buyerName: String(data.get("name") ?? "") });
    if (sent.ok) {
      setError(null);
      await refresh();
      await load();
      return;
    }
    setError(sent.error === "price-outside-range" ? { code: sent.error, price } : { code: sent.error });
  }

  function sendErrorMessage(failure: NonNullable<typeof error>): string {
    switch (failure.code) {
      case "invalid-price": {
        const check = validateRange({ min: failure.price, max: failure.price }, locale);
        return check.ok ? "" : check.message;
      }
      case "price-outside-range":
        return t("{0} is outside the range you and {1} share ({2}). Choose a price in that range.", formatUsd(failure.price, locale), expertName, formatRange(shared, locale));
      case "missing-time": return t("Choose when you'd like to meet.");
      case "time-in-past": return t("Choose a time in the future.");
      case "empty-name": return t("Tell {0} what to call you.", expertName);
      case "stale-match": return t("This match is no longer available. Go back and match again.");
      case "already-proposed": return t("You already have a proposal with this expert.");
      default: return t("Your proposal could not be sent. Please try again.");
    }
  }

  const declined = last?.proposal.state === "declined";
  const gone = last?.proposal.state === "unavailable";
  const validTotal = Number.isInteger(price) && price >= 1;

  return (
    <form onSubmit={(e) => void onSend(e)}>
      <h2 tabIndex={-1}>{t("Propose a session to {0}", expertName)}</h2>
      {declined && (
        <p className="notice notice--error" role="alert">
          {t("{0} declined your proposal. You can propose a different time or price.", expertName)}
        </p>
      )}
      {gone && (
        <p className="notice notice--error" role="alert">
          {t("The time you asked for is no longer available. Choose another.")}
        </p>
      )}
      <p className="lead">
        {t("You and {0} share a price range of {1} per 15 minutes.", expertName, formatRange(shared, locale))}
      </p>
      <div className="field">
        <label htmlFor="proposal-name">{t("Your name, as {0} will see it", expertName)}</label>
        <input id="proposal-name" name="name" type="text" autoComplete="name" defaultValue={account.name} required />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="proposal-units">{t("Session length")}</label>
          <select id="proposal-units" value={units} onChange={(e) => setUnits(Number(e.target.value))}>
            {LENGTHS.map((n) => (
              <option key={n} value={n}>
                {lengthText(n, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="proposal-price">{t("Price per 15 minutes")}</label>
          <input id="proposal-price" type="text" inputMode="numeric" value={priceText} onChange={(e) => setPriceText(e.target.value)} required />
        </div>
      </div>
      {validTotal && (
        <p className="lead">
          {t("{0} at {1} per 15 minutes comes to {2}.", lengthText(units, locale), formatUsd(price, locale), formatCents(sessionTotalCents(units, price), locale))}
        </p>
      )}
      <fieldset className="choices">
        <legend>{t("When would you like to meet?")}</legend>
        {times.map((time) => (
          <label key={time.toISOString()} className="choice">
            <input type="radio" name="when" value={time.toISOString()} />
            <span>{formatWhen(time.toISOString(), locale)}</span>
          </label>
        ))}
        <div className="field">
          <label htmlFor="proposal-other">{t("Or choose another date and time")}</label>
          <input id="proposal-other" name="other" type="datetime-local" />
        </div>
      </fieldset>
      <p className="notice notice--info">{t("Nothing is booked or charged until {0} accepts.", expertName)}</p>
      <StandIn ctx={ctx} service="payments" />
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {sendErrorMessage(error)}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          {t("Send my proposal")}
        </button>
        <a className="button-link button-link--quiet" href={href("buyer-match")}>
          {t("Back to my match")}
        </a>
      </div>
    </form>
  );
}
