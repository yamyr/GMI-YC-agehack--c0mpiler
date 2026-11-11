import type { ConversationTurn, Workflow } from "../domain/types";

export const DEBRIEF_TURNS: readonly ConversationTurn[] = [
  { speaker: "agent", text: "How did the session with Dev go?" },
  { speaker: "margaret", text: "Well. He hadn't noticed the tooling clause — the manufacturer kept ownership of the moulds." },
  { speaker: "agent", text: "What do you always ask first when you read one of these agreements?" },
  { speaker: "margaret", text: "What's the minimum order, who owns the tooling, and when do they get paid." },
  { speaker: "agent", text: "And what do you check before you'd call it safe to sign?" },
  { speaker: "margaret", text: "That acceptance criteria are written down, that prices can't rise without notice, and that tooling transfers if you leave." },
  { speaker: "agent", text: "I've turned that into a workflow for your engine. Nothing is added until you approve it." },
];

export const PROPOSED_WORKFLOW: Workflow = {
  name: "First read of a contract-manufacturing agreement",
  questions: [
    "What is the minimum order quantity, and is it per order or per year?",
    "Who owns the tooling and moulds?",
    "When and how does the manufacturer get paid?",
  ],
  checks: [
    "Acceptance criteria (sampling and defect limits) are written into the agreement",
    "Price increases need notice and have a cap",
    "Tooling and designs transfer to you if you leave",
  ],
  watchOuts: [
    "A minimum order with no limit on the total commitment",
    "Tooling held hostage to volume commitments",
    "“Industry-standard quality” with no definition",
  ],
  status: "proposed",
};
