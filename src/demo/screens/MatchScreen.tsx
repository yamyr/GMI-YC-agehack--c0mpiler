import { createTranslator, type Locale } from "../../../site/i18n/core.js";
import { useI18n } from "../../i18n";
import { formatRange } from "../domain/price";
import type { NotMatched } from "../domain/types";
import { currentMatch } from "../state/reducer";
import type { ScreenProps } from "./shared";

function whyNot(entry: NotMatched, competencyLabel: string, locale: Locale): string {
  const t = createTranslator(locale);
  switch (entry.reason) {
    case "competency":
      return t("Doesn't list “{0}”.", competencyLabel);
    case "price":
      return t("Charges {0} per 15 minutes, outside your budget.", entry.expert.priceRange === null ? t("an unknown price") : formatRange(entry.expert.priceRange, locale));
    case "unpublished":
      return t("Profile or price isn't published yet.");
    case "ranked":
      return t("Also a fit, but with a narrower price overlap or less experience.");
  }
}

/** FR-016–FR-018: the match and the reasons, or an honest no-match. */
export function MatchScreen({ state }: ScreenProps) {
  const { t, locale } = useI18n();

  const result = currentMatch(state);
  const label = state.brief.competencyLabel;

  return (
    <div>
      {result.kind === "match" ? (
        <>
          <h2 tabIndex={-1}>{t("Agely matched Dev with {0}", result.expert.name)}</h2>
          <div className="card">
            <h3>{result.expert.name}</h3>
            <p>{result.expert.headline}</p>
            <p className="big-price">{t("Price overlap: {0} per 15 minutes", formatRange(result.overlap, locale))}</p>
            <h3>{t("Why this match")}</h3>
            <ul className="plain-list">
              {result.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <h2 tabIndex={-1}>{t("No match yet")}</h2>
          <p className="notice notice--info">{result.explanation}</p>
        </>
      )}

      {result.others.length > 0 && (
        <>
          <h3>{t("Why not the others")}</h3>
          <ul className="plain-list">
            {result.others.map((entry) => (
              <li key={entry.expert.id}>
                {t("{0}: {1}", entry.expert.name, whyNot(entry, label, locale))}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
