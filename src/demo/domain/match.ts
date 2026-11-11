import { formatRange, overlap } from "./price";
import type { Brief, Competency, Expert, MatchResult, NotMatched, PriceRange } from "./types";

interface Candidate {
  readonly expert: Expert;
  readonly competencies: readonly Competency[];
  readonly overlap: PriceRange;
}

function firstName(expert: Expert): string {
  return expert.name.split(" ")[0] ?? expert.name;
}

/**
 * FR-016–FR-018 / research R3: an expert qualifies when published with a
 * confirmed price, holding the brief's competency, with a price range that
 * overlaps the budget. Ranked by overlap width, then years of experience.
 */
export function matchBrief(brief: Brief, experts: readonly Expert[]): MatchResult {
  const rejected: NotMatched[] = [];
  const candidates: Candidate[] = [];

  for (const expert of experts) {
    if (!expert.published || expert.priceRange === null) {
      rejected.push({ expert, reason: "unpublished" });
      continue;
    }
    const competencies = expert.competencies.filter((c) => c.tag === brief.competencyTag);
    if (competencies.length === 0) {
      rejected.push({ expert, reason: "competency" });
      continue;
    }
    const shared = overlap(expert.priceRange, brief.budget);
    if (shared === null) {
      rejected.push({ expert, reason: "price" });
      continue;
    }
    candidates.push({ expert, competencies, overlap: shared });
  }

  candidates.sort(
    (a, b) =>
      b.overlap.max - b.overlap.min - (a.overlap.max - a.overlap.min) ||
      b.expert.yearsExperience - a.expert.yearsExperience,
  );

  const [best, ...runnersUp] = candidates;
  if (best === undefined) {
    const priceGap = rejected.some((r) => r.reason === "price");
    return {
      kind: "none",
      reason: priceGap ? "price" : "competency",
      explanation: priceGap
        ? `Experts with “${brief.competencyLabel}” charge outside your budget of ${formatRange(brief.budget)} per 15 minutes. Widening the budget would let Agely match you.`
        : `No published expert lists “${brief.competencyLabel}” yet.`,
      others: rejected,
    };
  }

  const price = best.expert.priceRange ?? best.overlap;
  return {
    kind: "match",
    expert: best.expert,
    matchedCompetencies: best.competencies,
    overlap: best.overlap,
    explanation: [
      `${firstName(best.expert)} lists ${best.competencies.map((c) => `“${c.label}”`).join(", ")}, which covers what you need: “${brief.competencyLabel}”.`,
      `Your budget is ${formatRange(brief.budget)} per 15 minutes and ${firstName(best.expert)} charges ${formatRange(price)}. You overlap at ${formatRange(best.overlap)}.`,
      `${best.expert.yearsExperience} years of experience.`,
    ],
    others: [...runnersUp.map((c): NotMatched => ({ expert: c.expert, reason: "ranked" })), ...rejected],
  };
}
