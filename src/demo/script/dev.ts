import type { Brief, ConversationTurn } from "../domain/types";

export const BRIEF_TURNS: readonly ConversationTurn[] = [
  { speaker: "agent", text: "Hi Dev, I'm your buyer's agent. What problem do you need help with?" },
  { speaker: "dev", text: "We make a smart irrigation controller. I'm about to sign our first contract with a manufacturer in Guadalajara, and I've never done this before." },
  { speaker: "agent", text: "What worries you most about the agreement?" },
  { speaker: "dev", text: "The minimum order quantity, who owns the tooling, and what happens if units arrive faulty." },
  { speaker: "agent", text: "How much time do you need, and what's your budget?" },
  { speaker: "dev", text: "Thirty minutes would do. Somewhere between fifty and a hundred dollars per fifteen minutes." },
  { speaker: "agent", text: "Got it. I've drafted a brief for you to check." },
];

export const DEV_BRIEF: Brief = {
  problem: "Review the commercial terms of my first contract-manufacturing agreement before I sign.",
  competencyTag: "contract-manufacturing",
  competencyLabel: "Contract manufacturing terms",
  units: 2,
  budget: { min: 50, max: 100 },
  confirmed: false,
};

export const BRIEF_NOTE =
  "Agely doesn't give legal advice. This brief covers the commercial terms; for a legal review, use a lawyer.";
