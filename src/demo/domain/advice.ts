export type AdviceCategory = "legal" | "medical" | "financial";

/**
 * Deterministic, offline guard for the scripted demo (research R5). The real
 * buyer's agent will replace this with a proper classifier.
 */
const PATTERNS: readonly (readonly [AdviceCategory, RegExp])[] = [
  ["legal", /\blegal advice\b|\blawyers?\b|\blawsuits?\b|\bsue\b|\bsuing\b/i],
  ["medical", /\bdiagnos\w*|\bmedications?\b|\bsymptoms?\b|\btreatments?\b/i],
  ["financial", /\binvestment advice\b|\bwhich stocks\b|\btax advice\b|\bretirement savings\b/i],
];

export function detectRestrictedAdvice(text: string): AdviceCategory | null {
  for (const [category, pattern] of PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

export function restrictedAdviceMessage(category: AdviceCategory): string {
  return `Agely doesn't offer ${category} advice, so this brief can't be sent as written. Remove the ${category} question, or speak to a qualified professional.`;
}
