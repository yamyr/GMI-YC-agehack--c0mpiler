import { useCallback, useEffect, useState } from "react";
import { formatRange } from "../../demo/domain/price";
import type { NotMatched } from "../../demo/domain/types";
import type { Brief } from "../model/types";
import { href } from "../routes";
import { myCurrentBrief } from "../usecases/brief";
import { type MatchView, myMatch, runMatch } from "../usecases/match";
import type { ScreenProps } from "./shared";

function whyNot(other: NotMatched): string {
  if (other.reason === "competency") return "Doesn't list the skill you need.";
  if (other.reason === "price") return `Charges ${other.expert.priceRange === null ? "a price" : formatRange(other.expert.priceRange)} per 15 minutes, which is outside your budget.`;
  return "Also a fit, but with a narrower price overlap or less experience.";
}

/** Story 2: who fits, why, and why the others were not chosen (FR-011). */
export function BuyerMatchScreen({ ctx }: ScreenProps) {
  const [brief, setBrief] = useState<Brief | null | undefined>(undefined);
  const [view, setView] = useState<MatchView | null>(null);

  const rematch = useCallback(
    async (briefId: string) => {
      const result = await runMatch(ctx, briefId);
      setView(result.ok ? result.value : null);
    },
    [ctx],
  );

  useEffect(() => {
    void (async () => {
      const current = await myCurrentBrief(ctx);
      const found = current.ok ? current.value : null;
      setBrief(found);
      if (found === null || found.state !== "confirmed") return;
      const stored = await myMatch(ctx, found.id);
      if (stored.ok && stored.value !== null) setView(stored.value);
      else await rematch(found.id);
    })();
  }, [ctx, rematch]);

  if (brief === undefined) return <p className="lead">Looking for a match…</p>;
  if (brief === null || brief.state !== "confirmed") {
    return (
      <div>
        <h2 tabIndex={-1}>Your match</h2>
        <p className="lead">Agely matches you once you have confirmed a brief.</p>
        <div className="actions">
          <a className="button-link" href={href("buyer-brief")}>
            {brief === null ? "Describe my problem" : "Check my brief"}
          </a>
        </div>
      </div>
    );
  }
  if (view === null) return <p className="lead">Looking for a match…</p>;

  const { result } = view.match;
  const links = (
    <div className="actions">
      <button type="button" className="secondary" onClick={() => void rematch(brief.id)}>
        Match again
      </button>
      <a className="button-link button-link--quiet" href={href("buyer-brief")}>
        Change my brief
      </a>
      <a className="button-link button-link--quiet" href={href("buyer-brief-new")}>
        Start a new brief
      </a>
    </div>
  );

  if (view.stale && result.kind === "match") {
    return (
      <div>
        <h2 tabIndex={-1}>Your match</h2>
        <p className="notice notice--error" role="alert">
          This match is no longer available. {result.expert.name} has changed their profile or price since you were matched.
        </p>
        {links}
      </div>
    );
  }

  const others = result.others.length > 0 && (
    <>
      <h3>Why not the others</h3>
      <ul className="plain-list">
        {result.others.map((other) => (
          <li key={other.expert.id}>
            <strong>{other.expert.name}</strong>: {whyNot(other)}
          </li>
        ))}
      </ul>
    </>
  );

  if (result.kind === "none") {
    return (
      <div>
        <h2 tabIndex={-1}>No match yet</h2>
        <p className="lead">{result.explanation}</p>
        {others}
        {links}
      </div>
    );
  }

  return (
    <div>
      <h2 tabIndex={-1}>Agely matched you with {result.expert.name}</h2>
      <p className="lead">{result.expert.headline}</p>
      <p className="big-price">Price overlap: {formatRange(result.overlap)} per 15 minutes</p>
      <h3>Why this match</h3>
      <ul>
        {result.explanation.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="notice notice--info">Credentials are self-declared. Agely has not checked this expert's profile against any record.</p>
      {others}
      <div className="actions">
        <a className="button-link button-link--primary" href={href("buyer-proposal")}>
          Propose a session
        </a>
      </div>
      {links}
    </div>
  );
}
