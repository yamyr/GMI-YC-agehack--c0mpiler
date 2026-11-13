import type { Translator } from "../../site/i18n/core.js";
import type { Brief, ConversationTurn, Expert, SuggestedReply, Workflow } from "../demo/domain/types";

/** Translate only authored seed fields. Never call these on user-edited domain objects. */
export function seedExpert(expert: Expert, t: Translator): Expert {
  return { ...expert, headline: t(expert.headline), competencies: expert.competencies.map((skill) => ({
    ...skill, label: t(skill.label), description: t(skill.description),
  })), exampleProblems: expert.exampleProblems.map((problem) => t(problem)) };
}
export function seedBrief(brief: Brief, t: Translator): Brief {
  return { ...brief, problem: t(brief.problem), competencyLabel: t(brief.competencyLabel) };
}
export function seedWorkflow(workflow: Workflow, t: Translator): Workflow {
  return { ...workflow, name: t(workflow.name), questions: workflow.questions.map((line) => t(line)), checks: workflow.checks.map((line) => t(line)), watchOuts: workflow.watchOuts.map((line) => t(line)) };
}
export function seedTurns(turns: readonly ConversationTurn[], t: Translator): readonly ConversationTurn[] {
  return turns.map((turn) => ({ ...turn, text: t(turn.text) }));
}
export function seedReply(reply: SuggestedReply, t: Translator): SuggestedReply {
  return { ...reply, text: t(reply.text), ack: t(reply.ack), effect: reply.effect.kind === "renameCompetency" ? { ...reply.effect, label: t(reply.effect.label) } : reply.effect };
}
