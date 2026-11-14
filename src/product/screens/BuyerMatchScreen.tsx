import { useCallback, useEffect, useState } from "react";
import type { Locale, Translator } from "../../../site/i18n/core.js";
import { formatRange } from "../../demo/domain/price";
import type { NotMatched } from "../../demo/domain/types";
import { useI18n } from "../../i18n";
import type { Brief } from "../model/types";
import { href } from "../routes";
import { myCurrentBrief } from "../usecases/brief";
import { type MatchView, localizeStoredMatch, myMatch, runMatch } from "../usecases/match";
import type { ScreenProps } from "./shared";

function whyNot(other: NotMatched, locale: Locale, t: Translator): string {
  if (other.reason === "competency") return t("Doesn't list the skill you need.");
  if (other.reason === "price") {
    return other.expert.priceRange === null
      ? t("Charges a price per 15 minutes, which is outside your budget.")
      : t("Charges {0} per 15 minutes, which is outside your budget.", formatRange(other.expert.priceRange, locale));
  }
  return t("Also a fit, but with a narrower price overlap or less experience.");
}

/** Story 2: who fits, why, and why the others were not chosen (FR-011). */
export function BuyerMatchScreen({ ctx }: ScreenProps) {
  const { locale, t } = useI18n();
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

  if (brief === undefined) return <p className="lead">{t("Looking for a match…")}</p>;
  if (brief === null || brief.state !== "confirmed") {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Your match")}</h2>
        <p className="lead">{t("Agely matches you once you have confirmed a brief.")}</p>
        <div className="actions">
          <a className="button-link" href={href("buyer-brief")}>
            {t(brief === null ? "Describe my problem" : "Check my brief")}
          </a>
        </div>
      </div>
    );
  }
  if (view === null) return <p className="lead">{t("Looking for a match…")}</p>;

  const result = localizeStoredMatch(view.match.result, brief, locale);
  const links = (
    <div className="actions">
      <button type="button" className="secondary" onClick={() => void rematch(brief.id)}>
        {t("Match again")}
      </button>
      <a className="button-link button-link--quiet" href={href("buyer-brief")}>
        {t("Change my brief")}
      </a>
      <a className="button-link button-link--quiet" href={href("buyer-brief-new")}>
        {t("Start a new brief")}
      </a>
    </div>
  );

  if (view.stale && result.kind === "match") {
    return (
      <div>
        <h2 tabIndex={-1}>{t("Your match")}</h2>
        <p className="notice notice--error" role="alert">
          {t("This match is no longer available. {0} has changed their profile or price since you were matched.", result.expert.name)}
        </p>
        {links}
      </div>
    );
  }

  const others = result.others.length > 0 && (
    <>
      <h3>{t("Why not the others")}</h3>
      <ul className="plain-list">
        {result.others.map((other) => (
          <li key={other.expert.id}>
            <strong>{t("{0}:", other.expert.name)}</strong> {whyNot(other, locale, t)}
          </li>
        ))}
      </ul>
    </>
  );

  if (result.kind === "none") {
    return (
      <div>
        <h2 tabIndex={-1}>{t("No match yet")}</h2>
        <p className="lead">{result.explanation}</p>
        {others}
        {links}
      </div>
    );
  }

  return (
    <div>
      <h2 tabIndex={-1}>{t("Agely matched you with {0}", result.expert.name)}</h2>
      <p className="lead">{result.expert.headline}</p>
      <p className="big-price">{t("Price overlap: {0} per 15 minutes", formatRange(result.overlap, locale))}</p>
      <h3>{t("Why this match")}</h3>
      <ul>
        {result.explanation.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="notice notice--info">{t("Credentials are self-declared. Agely has not checked this expert's profile against any record.")}</p>
      {others}
      <div className="actions">
        <a className="button-link button-link--primary" href={href("buyer-proposal")}>
          {t("Propose a session")}
        </a>
      </div>
      {links}
    </div>
  );
}
