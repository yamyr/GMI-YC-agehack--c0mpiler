import type { ConversationId, Persona } from "../domain/types";

/** Chapters, in story order (FR-004a). */
export const CHAPTERS = [
  "Margaret onboards",
  "Price",
  "Dev's brief",
  "Match",
  "Book & pay",
  "Debrief",
  "Engine",
] as const;

export type Chapter = (typeof CHAPTERS)[number];

export type StepId =
  | "start"
  | "interview"
  | "profile"
  | "price"
  | "briefChat"
  | "brief"
  | "match"
  | "proposal"
  | "accept"
  | "session"
  | "debrief"
  | "workflow"
  | "engine";

export interface StepDef {
  readonly id: StepId;
  readonly chapter: Chapter | null;
  readonly persona: Persona | null;
  readonly title: string;
  /** Conversation revealed on this step, if any. */
  readonly conversation?: ConversationId;
}

/** See specs/001-demo-walkthrough/contracts/demo-actions.md. */
export const STEPS: readonly StepDef[] = [
  { id: "start", chapter: null, persona: null, title: "Meet Margaret and Dev" },
  { id: "interview", chapter: "Margaret onboards", persona: "margaret", title: "Margaret talks to the onboarding agent", conversation: "interview" },
  { id: "profile", chapter: "Margaret onboards", persona: "margaret", title: "Margaret reviews her draft profile" },
  { id: "price", chapter: "Price", persona: "margaret", title: "Margaret sets her price" },
  { id: "briefChat", chapter: "Dev's brief", persona: "dev", title: "Dev describes his problem", conversation: "brief" },
  { id: "brief", chapter: "Dev's brief", persona: "dev", title: "Dev checks his brief" },
  { id: "match", chapter: "Match", persona: "dev", title: "Agely finds a match" },
  { id: "proposal", chapter: "Book & pay", persona: "dev", title: "Dev proposes a session" },
  { id: "accept", chapter: "Book & pay", persona: "margaret", title: "Margaret answers Dev's proposal" },
  { id: "session", chapter: "Book & pay", persona: "both", title: "The session is booked" },
  { id: "debrief", chapter: "Debrief", persona: "margaret", title: "The agent debriefs Margaret", conversation: "debrief" },
  { id: "workflow", chapter: "Debrief", persona: "margaret", title: "Margaret reviews a new workflow" },
  { id: "engine", chapter: "Engine", persona: "margaret", title: "Margaret's engine" },
];

export function stepIndexOf(id: StepId): number {
  return STEPS.findIndex((step) => step.id === id);
}

export function firstStepOf(chapter: Chapter): number {
  return STEPS.findIndex((step) => step.chapter === chapter);
}
