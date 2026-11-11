import type { ConversationTurn, Expert, PriceSuggestion, SuggestedReply } from "../domain/types";

/** Scripted onboarding interview. Stands in for a voice conversation (FR-005). */
export const INTERVIEW_TURNS: readonly ConversationTurn[] = [
  { speaker: "agent", text: "Hello Margaret, I'm the Agely onboarding agent. There's nothing to fill in — we'll just talk. What did you do before you retired?" },
  { speaker: "margaret", text: "I ran procurement for an appliance maker in Ohio. Thirty-four years, the last twelve as director." },
  { speaker: "agent", text: "What were you responsible for, day to day?" },
  { speaker: "margaret", text: "Choosing suppliers, negotiating the contracts, and making sure the factories in Mexico and China shipped what we paid for." },
  { speaker: "agent", text: "Tell me about a supplier problem you're proud of solving." },
  { speaker: "margaret", text: "A contract manufacturer tied our tooling to a three-year volume commitment. I renegotiated so we owned the moulds outright, and cut unit cost by eleven percent." },
  { speaker: "agent", text: "Is there anything you'd like me to read?" },
  { speaker: "margaret", text: "My CV, and the supplier-audit checklist I used for twenty years." },
  { speaker: "agent", text: "Thank you, I've read both. I'll draft a profile for you. Nothing goes live until you say so." },
];

/** The agent's draft. Interview turn numbers are 1-based, matching what the screen shows. */
export const MARGARET_DRAFT: Expert = {
  id: "margaret",
  name: "Margaret Okafor",
  age: 68,
  headline: "Retired procurement director · contract manufacturing and supplier negotiation",
  yearsExperience: 34,
  location: "Columbus, Ohio",
  competencies: [
    {
      id: "c1",
      tag: "contract-manufacturing",
      label: "Contract manufacturing terms",
      description: "Minimum orders, tooling ownership, payment and acceptance terms with contract manufacturers.",
      source: { kind: "interview", turn: 6 },
    },
    {
      id: "c2",
      tag: "supplier-negotiation",
      label: "Supplier negotiation",
      description: "Price, volume and lead-time negotiation with overseas suppliers.",
      source: { kind: "interview", turn: 4 },
    },
    {
      id: "c3",
      tag: "supplier-audits",
      label: "Supplier quality audits",
      description: "On-site and remote audits against a proven checklist.",
      source: { kind: "document", name: "Supplier audit checklist.pdf" },
    },
    {
      id: "c4",
      tag: "cost-down",
      label: "Cost-down programmes",
      description: "Structured unit-cost reduction with existing suppliers.",
      source: { kind: "document", name: "Margaret Okafor CV.pdf" },
    },
  ],
  exampleProblems: [
    "Reviewing a first contract-manufacturing agreement before signing",
    "Preparing for a price negotiation with an overseas supplier",
    "Planning a first supplier audit",
  ],
  priceRange: null,
  published: false,
  credentialsSelfDeclared: true,
};

export const PRICE_SUGGESTION: PriceSuggestion = {
  range: { min: 60, max: 90 },
  reasons: [
    "Thirty-four years in procurement, twelve of them as a director, puts you in the top band for this kind of advice.",
    "Hardware founders often ask for help with contract-manufacturing terms, and few experts offer it.",
    "Starting mid-range helps you collect your first ratings quickly. You can change it any time.",
  ],
};

export const PROFILE_PROMPT = "Anything you'd like to change before I publish?";

export const PROFILE_REPLIES: readonly SuggestedReply[] = [
  {
    id: "profile-rename",
    text: "Call the first one “Contract manufacturing negotiation”.",
    ack: "Done — I've renamed it.",
    effect: { kind: "renameCompetency", id: "c1", label: "Contract manufacturing negotiation" },
  },
  {
    id: "profile-remove",
    text: "Take off “Cost-down programmes”. I'd rather not do that work now.",
    ack: "Removed. You still have three skills listed.",
    effect: { kind: "removeCompetency", id: "c4" },
  },
  {
    id: "profile-ok",
    text: "That looks right.",
    ack: "Good. Select “Publish my profile” when you're ready.",
    effect: { kind: "none" },
  },
];

export const PRICE_PROMPT = "Does that price feel right to you?";

export const PRICE_REPLIES: readonly SuggestedReply[] = [
  {
    id: "price-keep",
    text: "That sounds right.",
    ack: "I'll use $60–$90 per 15 minutes. Confirm it when you're ready.",
    effect: { kind: "setPrice", range: { min: 60, max: 90 } },
  },
  {
    id: "price-higher",
    text: "I'd rather charge $65–$95.",
    ack: "Changed to $65–$95 per 15 minutes. Confirm it when you're ready.",
    effect: { kind: "setPrice", range: { min: 65, max: 95 } },
  },
];
