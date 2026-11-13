import { createTranslator, formatList, formatNumber, type Locale, type Translator } from "../../../site/i18n/core.js";
import { normalizeDecimalDigits } from "../../i18n/digits";
import { STAND_IN_LABELS } from "../copy";
import { CATALOGUE, exactSkillLabel, findSkills } from "../model/catalogue";
import type { AgentPort, AgentQuestion, DraftSkill, InterviewAnswer } from "../ports";

export const INTERVIEW: readonly AgentQuestion[] = [
  { id: "work", text: "There's nothing to fill in. We'll just talk. What work did you do, and for how long?", suggestedReplies: ["I ran procurement for a manufacturer for 34 years.", "I was a hospital pharmacist for 38 years.", "I kept the books for small businesses for 25 years."] },
  { id: "responsible", text: "What were you responsible for, day to day?", suggestedReplies: ["Choosing suppliers and negotiating the contracts.", "Staff scheduling and dealing with vendors.", "Payroll, bookkeeping and hiring."] },
  { id: "proud", text: "Tell me about a problem you're proud of solving.", suggestedReplies: ["I renegotiated a contract so we owned our tooling.", "I cut our unit cost with the same suppliers.", "I passed a hard audit after fixing our process."] },
  { id: "where", text: "Where are you based?", suggestedReplies: ["Columbus, Ohio", "Leeds, England", "I'd rather not say"] },
];

export const BRIEF: readonly AgentQuestion[] = [
  { id: "problem", text: "What problem do you need help with?", suggestedReplies: ["I'm about to sign with a contract manufacturer for the first time.", "I need to negotiate prices with a supplier.", "I'm hiring my first employee."] },
  { id: "length", text: "How much time do you need?", suggestedReplies: ["15 minutes", "30 minutes", "45 minutes"] },
  { id: "budget", text: "What is your budget per 15 minutes?", suggestedReplies: ["$40 to $70", "$50 to $100", "$80 to $140"] },
];

const firstSentence = (text: string): string => {
  const sentence = text.trim().split(/(?<=[.!?])\s|(?<=[。！？।])/u)[0] ?? "";
  const characters = [...sentence];
  return characters.length > 120 ? `${characters.slice(0, 117).join("")}...` : sentence;
};

const numbers = (text: string): number[] => (normalizeDecimalDigits(text).match(/\d+/g) ?? []).map(Number);
const roundTo5 = (n: number): number => Math.max(5, Math.round(n / 5) * 5);

function displayAnswer(answer: InterviewAnswer | undefined, questions: readonly AgentQuestion[], t: Translator): string {
  if (answer === undefined) return "";
  const question = questions.find(({ id }) => id === answer.questionId);
  return answer.suggested && question?.suggestedReplies.includes(answer.text) ? t(answer.text) : answer.text;
}

function answerLocale(answer: InterviewAnswer, selected: Locale): Locale {
  return answer.suggested ? "en" : answer.locale ?? selected;
}

/** Find a numeric duration or experience count followed by a known unit. */
function numberWithUnit(text: string, unit: "year" | "hour" | "minute", locale: Locale): number | undefined {
  const patterns = new Set<string>();
  // These samples cover the plural forms used by the supported languages.
  for (const language of new Set<Locale>([locale, "en"])) {
    const formatter = new Intl.NumberFormat(language === "tl" ? "fil-PH" : language, { style: "unit", unit, unitDisplay: "long" });
    for (const count of [1, 2, 5, 11, 21]) {
      const pattern = formatter.formatToParts(count).map(({ type, value }) => {
        if (type === "integer") return "\\d+";
        if (type === "literal" && value.trim() === "") return "\\s*";
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      }).join("");
      patterns.add(pattern);
    }
  }
  const boundary = locale === "ja" || locale === "zh-Hans" ? "" : "(?![\\p{L}\\p{M}])";
  const normalized = normalizeDecimalDigits(text).replace(/(\d)\s*\+\s*/g, "$1 ");
  const match = new RegExp(`(?<!\\d)(?:${[...patterns].join("|")})${boundary}`, "iu").exec(normalized);
  return match === null ? undefined : numbers(match[0])[0];
}

function durationMinutes(text: string, locale: Locale): number | undefined {
  const hours = numberWithUnit(text, "hour", locale);
  const minutes = numberWithUnit(text, "minute", locale);
  if (hours !== undefined) return hours * 60 + (minutes ?? 0);
  return minutes ?? numbers(text)[0];
}

/**
 * Stand-in drafting agent (research R5): fixed questions, and drafts built by looking for
 * catalogue keywords in what the person said. It invents nothing it did not hear.
 */
export function makeStandInAgent(): AgentPort {
  return {
    status: { service: "agent", connected: false, label: STAND_IN_LABELS.agent },

    async interviewQuestions() {
      return [...INTERVIEW];
    },

    async draftProfile(answers, locale = "en") {
      const t = createTranslator(locale);
      const skills: DraftSkill[] = [];
      answers.forEach((answer, index) => {
        for (const skill of findSkills(answer.text, answerLocale(answer, locale))) {
          if (skills.length < 5 && !skills.some((s) => s.tag === skill.tag)) {
            skills.push({ tag: skill.tag, label: skill.label, description: skill.description, sourceTurn: index + 1 });
          }
        }
      });
      const years = answers.map((answer) => numberWithUnit(answer.text, "year", answerLocale(answer, locale))).find((count) => count !== undefined);
      const where = answers.find((a) => a.questionId === "where")?.text.trim() ?? "";
      return {
        headline: firstSentence(displayAnswer(answers[0], INTERVIEW, t)),
        location: /rather not/i.test(where) ? "" : where,
        yearsExperience: years ?? 0,
        skills,
        unmatched: skills.length === 0,
      };
    },

    async suggestPrice(profile, locale: Locale = "en") {
      const t = createTranslator(locale);
      // A starting point that grows with experience: $40 at none, about $75 at 35 years.
      const mid = 40 + Math.min(profile.yearsExperience, 45);
      const range = { min: roundTo5(mid * 0.8), max: roundTo5(mid * 1.2) };
      const reasons = [
        profile.yearsExperience > 0
          ? t("{0} years of experience puts you above a starting rate.", formatNumber(profile.yearsExperience, locale))
          : t("Without a number of years to go on, this is a modest starting rate."),
        t("Starting in the middle of the range helps you get your first sessions. You can change it at any time."),
      ];
      if (profile.skills.length > 0) {
        const list = formatList(profile.skills.map((skill) => skill.label), locale);
        reasons.push(profile.skills.length === 1 ? t("It reflects the skill you described: {0}.", list) : t("It reflects the skills you described: {0}.", list));
      }
      return { range, reasons };
    },

    async briefQuestions() {
      return [...BRIEF];
    },

    async draftBrief(answers, locale = "en") {
      const problem = answers[0];
      const exact = problem === undefined ? undefined : exactSkillLabel(problem.text, answerLocale(problem, locale));
      const candidates = new Set(answers.flatMap((answer) => findSkills(answer.text, answerLocale(answer, locale))));
      const skill = exact ?? CATALOGUE.find((candidate) => candidates.has(candidate));
      const length = answers.find((answer) => answer.questionId === "length") ?? answers[1];
      const minutes = length === undefined ? undefined : durationMinutes(length.text, answerLocale(length, locale));
      const units = minutes === undefined ? 2 : Math.min(8, Math.max(1, Math.round(minutes / 15)));
      const [a, b] = numbers(answers.find((x) => x.questionId === "budget")?.text ?? answers[2]?.text ?? "");
      const budget = a !== undefined && b !== undefined && a >= 1 && b >= 1 ? { min: Math.min(a, b), max: Math.max(a, b) } : { min: 50, max: 100 };
      return { problem: firstSentence(displayAnswer(problem, BRIEF, createTranslator(locale))), skillTag: skill?.tag ?? null, units, budget, unmatched: skill === undefined };
    },
  };
}
