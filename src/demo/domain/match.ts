import { createTranslator, formatList, formatNumber, type Locale } from "../../../site/i18n/core.js";
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

export function explainNoMatch(brief: Brief, reason: "price" | "competency", locale: Locale): string {
  const t = createTranslator(locale);
  return reason === "price"
    ? t("Experts with “{0}” charge outside your budget of {1} per 15 minutes. Widening the budget would let Agely match you.", brief.competencyLabel, formatRange(brief.budget, locale))
    : t("No published expert lists “{0}” yet.", brief.competencyLabel);
}

export function explainMatch(brief: Brief, candidate: Candidate, locale: Locale): readonly string[] {
  const t = createTranslator(locale);
  const { expert, competencies, overlap: shared } = candidate;
  const price = expert.priceRange ?? shared;
  return [
    t("{0} lists {1}, which covers what you need: “{2}”.", firstName(expert), formatList(competencies.map((c) => t("“{0}”", c.label)), locale), brief.competencyLabel),
    t("Your budget is {0} per 15 minutes and {1} charges {2}. You overlap at {3}.", formatRange(brief.budget, locale), firstName(expert), formatRange(price, locale), formatRange(shared, locale)),
    t("{0} years of experience.", formatNumber(expert.yearsExperience, locale)),
  ];
}

/**
 * FR-016–FR-018 / research R3: an expert qualifies when published with a
 * confirmed price, holding the brief's competency, with a price range that
 * overlaps the budget. Ranked by overlap width, then years of experience.
 */
export function matchBrief(brief: Brief, experts: readonly Expert[], locale: Locale = "en"): MatchResult {
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
    const reason = rejected.some((r) => r.reason === "price") ? "price" : "competency";
    return {
      kind: "none",
      reason,
      explanation: explainNoMatch(brief, reason, locale),
      others: rejected,
    };
  }

  return {
    kind: "match",
    expert: best.expert,
    matchedCompetencies: best.competencies,
    overlap: best.overlap,
    explanation: explainMatch(brief, best, locale),
    others: [...runnersUp.map((c): NotMatched => ({ expert: c.expert, reason: "ranked" })), ...rejected],
  };
}
