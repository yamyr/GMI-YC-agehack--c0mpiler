import type { ConversationId } from "../domain/types";
import type { AgentBrief } from "./types";

const MARGARET =
  "Margaret Okafor, 68, lives in Columbus, Ohio. She spent 34 years in procurement at an appliance maker, " +
  "the last twelve as director. She chose suppliers, negotiated contracts, and made sure factories in Mexico " +
  "and China shipped what was paid for. Proudest fix: a contract manufacturer tied her company's tooling to a " +
  "three-year volume commitment; she renegotiated so they owned the moulds outright and cut unit cost by 11%. " +
  "She has her CV and a supplier-audit checklist she used for twenty years.";

const DEV =
  "Dev Patel founded a six-person hardware startup that makes a smart irrigation controller. He is about to " +
  "sign his first contract with a contract manufacturer in Guadalajara and has never done this before. He " +
  "worries about the minimum order quantity, who owns the tooling, and what happens if units arrive faulty. " +
  "He wants about 30 minutes and can pay $50–$100 per 15 minutes.";

const SESSION =
  "Margaret has just had a 30-minute Agely session with Dev Patel, a hardware founder about to sign his first " +
  "contract-manufacturing agreement. She noticed the manufacturer kept ownership of the moulds. " +
  MARGARET;

/** FR-008: each conversation has its own role, goal and persona background. */
export const BRIEFS: Readonly<Record<ConversationId, AgentBrief>> = {
  interview: {
    conversation: "interview",
    agentRole: "Agely onboarding agent",
    goal:
      "Interview Margaret, a newly retired expert, so Agely can draft her skill profile: her career, what she " +
      "was responsible for, a supplier problem she is proud of solving, and any documents she can share.",
    background: MARGARET,
    replyAs: "Margaret",
    maxTurns: 5,
  },
  brief: {
    conversation: "brief",
    agentRole: "Agely buyer's agent",
    goal:
      "Help Dev, a founder, turn his business problem into a clear brief: the problem, what worries him most, " +
      "how much time he needs, and his budget per 15 minutes.",
    background: DEV,
    replyAs: "Dev",
    maxTurns: 5,
  },
  debrief: {
    conversation: "debrief",
    agentRole: "Agely debrief agent",
    goal:
      "Debrief Margaret after her session so her engine can learn how she thinks: how it went, the questions " +
      "she always asks first when reading a contract-manufacturing agreement, the checks she runs, and the " +
      "mistakes she watches for.",
    background: SESSION,
    replyAs: "Margaret",
    maxTurns: 5,
  },
};
