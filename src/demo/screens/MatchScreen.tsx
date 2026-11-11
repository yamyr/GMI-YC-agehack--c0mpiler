import { formatRange } from "../domain/price";
import type { NotMatched } from "../domain/types";
import { currentMatch } from "../state/reducer";
import type { ScreenProps } from "./shared";

function whyNot(entry: NotMatched, competencyLabel: string): string {
  switch (entry.reason) {
    case "competency":
      return `Doesn't list “${competencyLabel}”.`;
    case "price":
      return `Charges ${entry.expert.priceRange === null ? "an unknown price" : formatRange(entry.expert.priceRange)} per 15 minutes, outside your budget.`;
    case "unpublished":
      return "Profile or price isn't published yet.";
    case "ranked":
      return "Also a fit, but with a narrower price overlap or less experience.";
  }
}

/** FR-016–FR-018: the match and the reasons, or an honest no-match. */
export function MatchScreen({ state }: ScreenProps) {
  const result = currentMatch(state);
  const label = state.brief.competencyLabel;

  return (
    <div>
      {result.kind === "match" ? (
        <>
          <h2 tabIndex={-1}>Agely matched Dev with {result.expert.name}</h2>
          <div className="card">
            <h3>{result.expert.name}</h3>
            <p>{result.expert.headline}</p>
            <p className="big-price">Price overlap: {formatRange(result.overlap)} per 15 minutes</p>
            <h3>Why this match</h3>
            <ul className="plain-list">
              {result.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <h2 tabIndex={-1}>No match yet</h2>
          <p className="notice notice--info">{result.explanation}</p>
        </>
      )}

      {result.others.length > 0 && (
        <>
          <h3>Why not the others</h3>
          <ul className="plain-list">
            {result.others.map((entry) => (
              <li key={entry.expert.id}>
                <strong>{entry.expert.name}</strong>: {whyNot(entry, label)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
