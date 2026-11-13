import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatUsd } from "../../demo/domain/money";
import { formatRange, overlap } from "../../demo/domain/price";
import { formatCents, sessionTotalCents } from "../model/money";
import { formatWhen, lengthText, suggestedTimes } from "../model/times";
import type { Brief } from "../model/types";
import { href } from "../routes";
import { type ProposalView, myProposals, sendProposal, withdrawProposal } from "../usecases/booking";
import { myCurrentBrief } from "../usecases/brief";
import { type MatchView, myMatch } from "../usecases/match";
import { type ScreenProps, StandIn } from "./shared";

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Story 3: the buyer proposes a length, a price inside the shared range and a time (FR-013). */
export function BuyerProposalScreen({ ctx, account, refresh }: ScreenProps) {
  const [loaded, setLoaded] = useState<{ brief: Brief | null; view: MatchView | null; last: ProposalView | null } | undefined>(undefined);
  const [units, setUnits] = useState(2);
  const [price, setPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
      setPrice(Math.round((view.match.result.overlap.min + view.match.result.overlap.max) / 2));
    }
  }, [ctx]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loaded === undefined) return <p className="lead">Opening your proposal…</p>;
  const { brief, view, last } = loaded;
  const result = view?.match.result;

  if (brief === null || view === null || result === undefined || result.kind !== "match" || view.stale) {
    return (
      <div>
        <h2 tabIndex={-1}>Propose a session</h2>
        <p className="lead">You need a current match before you can propose a session.</p>
        <div className="actions">
          <a className="button-link" href={href("buyer-match")}>
            See my match
          </a>
        </div>
      </div>
    );
  }

  const expertName = result.expert.name;
  // The range in force now: the expert's own range may be wider than the budget.
  const shared = (result.expert.priceRange !== null ? overlap(result.expert.priceRange, brief.budget) : null) ?? result.overlap;

  if (last !== null && last.proposal.state === "waiting") {
    return (
      <div>
        <h2 tabIndex={-1}>Waiting for {expertName} to answer</h2>
        <p className="lead">
          You proposed {lengthText(last.proposal.units)} at {formatUsd(last.proposal.pricePerUnit)} per 15 minutes, {formatCents(last.totalCents)} in total, on {formatWhen(last.proposal.startsAt)}.
        </p>
        <p className="notice notice--info">Nothing is booked or charged until {expertName} accepts. They will see your proposal the next time they open Agely; nothing is sent to them.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => void withdrawProposal(ctx, last.proposal.id).then(load)}>
            Withdraw my proposal
          </button>
        </div>
      </div>
    );
  }

  if (last !== null && last.proposal.state === "accepted" && last.sessionId !== null) {
    return (
      <div>
        <h2 tabIndex={-1}>{expertName} accepted</h2>
        <p className="lead">Your session is confirmed.</p>
        <div className="actions">
          <a className="button-link" href={href("session", { id: last.sessionId })}>
            See my session
          </a>
        </div>
      </div>
    );
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (brief === null) return;
    const data = new FormData(event.currentTarget);
    const other = String(data.get("other") ?? "");
    const picked = String(data.get("when") ?? "");
    const startsAt = other !== "" ? new Date(other).toISOString() : picked;
    if (startsAt === "") return setError("Choose when you'd like to meet.");
    const sent = await sendProposal(ctx, brief.id, { units, pricePerUnit: price, startsAt, buyerName: String(data.get("name") ?? "") });
    if (sent.ok) {
      setError(null);
      await refresh();
      await load();
      return;
    }
    const messages: Partial<Record<typeof sent.error, string>> = {
      "price-outside-range": `${formatUsd(price)} is outside the range you and ${expertName} share (${formatRange(shared)}). Choose a price in that range.`,
      "time-in-past": "Choose a time in the future.",
      "empty-name": `Tell ${expertName} what to call you.`,
      "stale-match": "This match is no longer available. Go back and match again.",
      "already-proposed": "You already have a proposal with this expert.",
    };
    setError(messages[sent.error] ?? "Your proposal could not be sent. Please try again.");
  }

  const declined = last?.proposal.state === "declined";
  const gone = last?.proposal.state === "unavailable";
  const validTotal = Number.isInteger(price) && price >= 1;

  return (
    <form onSubmit={(e) => void onSend(e)}>
      <h2 tabIndex={-1}>Propose a session to {expertName}</h2>
      {declined && (
        <p className="notice notice--error" role="alert">
          {expertName} declined your proposal. You can propose a different time or price.
        </p>
      )}
      {gone && (
        <p className="notice notice--error" role="alert">
          The time you asked for is no longer available. Choose another.
        </p>
      )}
      <p className="lead">
        You and {expertName} share a price range of {formatRange(shared)} per 15 minutes.
      </p>
      <div className="field">
        <label htmlFor="proposal-name">Your name, as {expertName} will see it</label>
        <input id="proposal-name" name="name" type="text" autoComplete="name" defaultValue={account.name} required />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="proposal-units">Session length</label>
          <select id="proposal-units" value={units} onChange={(e) => setUnits(Number(e.target.value))}>
            {LENGTHS.map((n) => (
              <option key={n} value={n}>
                {lengthText(n)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="proposal-price">Price per 15 minutes</label>
          <input id="proposal-price" type="number" min={1} step={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
        </div>
      </div>
      {validTotal && (
        <p className="lead">
          {lengthText(units)} at {formatUsd(price)} per 15 minutes comes to {formatCents(sessionTotalCents(units, price))}.
        </p>
      )}
      <fieldset className="choices">
        <legend>When would you like to meet?</legend>
        {times.map((time) => (
          <label key={time.toISOString()} className="choice">
            <input type="radio" name="when" value={time.toISOString()} />
            <span>{formatWhen(time.toISOString())}</span>
          </label>
        ))}
        <div className="field">
          <label htmlFor="proposal-other">Or choose another date and time</label>
          <input id="proposal-other" name="other" type="datetime-local" />
        </div>
      </fieldset>
      <p className="notice notice--info">Nothing is booked or charged until {expertName} accepts.</p>
      <StandIn ctx={ctx} service="payments" />
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          Send my proposal
        </button>
        <a className="button-link button-link--quiet" href={href("buyer-match")}>
          Back to my match
        </a>
      </div>
    </form>
  );
}
