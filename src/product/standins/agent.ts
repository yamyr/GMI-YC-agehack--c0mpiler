import { STAND_IN_LABELS } from "../copy";
import { findSkills } from "../model/catalogue";
import type { AgentPort, AgentQuestion, DraftSkill, InterviewAnswer } from "../ports";

const INTERVIEW: readonly AgentQuestion[] = [
  { id: "work", text: "There's nothing to fill in. We'll just talk. What work did you do, and for how long?", suggestedReplies: ["I ran procurement for a manufacturer for 34 years.", "I was a hospital pharmacist for 38 years.", "I kept the books for small businesses for 25 years."] },
  { id: "responsible", text: "What were you responsible for, day to day?", suggestedReplies: ["Choosing suppliers and negotiating the contracts.", "Staff scheduling and dealing with vendors.", "Payroll, bookkeeping and hiring."] },
  { id: "proud", text: "Tell me about a problem you're proud of solving.", suggestedReplies: ["I renegotiated a contract so we owned our tooling.", "I cut our unit cost with the same suppliers.", "I passed a hard audit after fixing our process."] },
  { id: "where", text: "Where are you based?", suggestedReplies: ["Columbus, Ohio", "Leeds, England", "I'd rather not say"] },
];

const BRIEF: readonly AgentQuestion[] = [
  { id: "problem", text: "What problem do you need help with?", suggestedReplies: ["I'm about to sign with a contract manufacturer for the first time.", "I need to negotiate prices with a supplier.", "I'm hiring my first employee."] },
  { id: "length", text: "How much time do you need?", suggestedReplies: ["15 minutes", "30 minutes", "45 minutes"] },
  { id: "budget", text: "What is your budget per 15 minutes?", suggestedReplies: ["$40 to $70", "$50 to $100", "$80 to $140"] },
];

const firstSentence = (text: string): string => {
  const sentence = text.trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return sentence.length > 120 ? `${sentence.slice(0, 117)}...` : sentence;
};

const numbers = (text: string): number[] => (text.match(/\d+/g) ?? []).map(Number);
const roundTo5 = (n: number): number => Math.max(5, Math.round(n / 5) * 5);

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

    async draftProfile(answers: readonly InterviewAnswer[]) {
      const skills: DraftSkill[] = [];
      answers.forEach((answer, index) => {
        for (const skill of findSkills(answer.text)) {
          if (skills.length < 5 && !skills.some((s) => s.tag === skill.tag)) {
            skills.push({ tag: skill.tag, label: skill.label, description: skill.description, sourceTurn: index + 1 });
          }
        }
      });
      const all = answers.map((a) => a.text).join(" ");
      const years = /(\d{1,2})\s*(?:\+\s*)?years/i.exec(all);
      const where = answers.find((a) => a.questionId === "where")?.text.trim() ?? "";
      return {
        headline: firstSentence(answers[0]?.text ?? ""),
        location: /rather not/i.test(where) ? "" : where,
        yearsExperience: years ? Number(years[1]) : 0,
        skills,
        unmatched: skills.length === 0,
      };
    },

    async suggestPrice(profile) {
      // A starting point that grows with experience: $40 at none, about $75 at 35 years.
      const mid = 40 + Math.min(profile.yearsExperience, 45);
      const range = { min: roundTo5(mid * 0.8), max: roundTo5(mid * 1.2) };
      const reasons = [
        profile.yearsExperience > 0
          ? `${profile.yearsExperience} years of experience puts you above a starting rate.`
          : "Without a number of years to go on, this is a modest starting rate.",
        "Starting in the middle of the range helps you get your first sessions. You can change it at any time.",
      ];
      if (profile.skills.length > 0) reasons.push(`It reflects the ${profile.skills.length === 1 ? "skill" : "skills"} you described: ${profile.skills.map((s) => s.label).join(", ")}.`);
      return { range, reasons };
    },

    async briefQuestions() {
      return [...BRIEF];
    },

    async draftBrief(answers: readonly InterviewAnswer[]) {
      const problem = answers[0]?.text.trim() ?? "";
      const skill = findSkills(answers.map((a) => a.text).join(" "))[0];
      const minutes = numbers(answers.find((a) => a.questionId === "length")?.text ?? answers[1]?.text ?? "")[0];
      const units = minutes === undefined ? 2 : Math.min(8, Math.max(1, Math.round(minutes / 15)));
      const [a, b] = numbers(answers.find((x) => x.questionId === "budget")?.text ?? answers[2]?.text ?? "");
      const budget = a !== undefined && b !== undefined && a >= 1 && b >= 1 ? { min: Math.min(a, b), max: Math.max(a, b) } : { min: 50, max: 100 };
      return { problem: firstSentence(problem), skillTag: skill?.tag ?? null, units, budget, unmatched: skill === undefined };
    },
  };
}
