/** Entities for the demo walkthrough — see specs/001-demo-walkthrough/data-model.md. */

/** Whose side of the story is on screen. */
export type Persona = "margaret" | "dev" | "both";

export type Speaker = "agent" | "margaret" | "dev";

export interface ConversationTurn {
  readonly speaker: Speaker;
  readonly text: string;
}

export type ConversationId = "interview" | "brief" | "debrief";

/** Invariant: 0 ≤ shown ≤ turns.length. */
export interface Conversation {
  readonly id: ConversationId;
  readonly turns: readonly ConversationTurn[];
  readonly shown: number;
}

export type CompetencySource =
  | { readonly kind: "interview"; readonly turn: number }
  | { readonly kind: "document"; readonly name: string };

export interface Competency {
  readonly id: string;
  /** Matching key, e.g. `contract-manufacturing`. */
  readonly tag: string;
  /** Editable by the expert; must be non-empty after trim. */
  readonly label: string;
  readonly description: string;
  readonly source: CompetencySource;
}

/** Whole USD per 15-minute unit. */
export interface PriceRange {
  readonly min: number;
  readonly max: number;
}

export interface PriceSuggestion {
  readonly range: PriceRange;
  /** At least two (FR-010). */
  readonly reasons: readonly string[];
}

export interface Expert {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly headline: string;
  readonly yearsExperience: number;
  readonly location: string;
  /** 3–5 when published (FR-007). */
  readonly competencies: readonly Competency[];
  readonly exampleProblems: readonly string[];
  /** Required to be matchable. */
  readonly priceRange: PriceRange | null;
  /** Only `true` via the `publishProfile` action. */
  readonly published: boolean;
  /** Always shown as self-declared (FR-012). */
  readonly credentialsSelfDeclared: true;
}

export interface Brief {
  readonly problem: string;
  readonly competencyTag: string;
  readonly competencyLabel: string;
  /** 15-minute units, integer ≥ 1 (2 = 30 minutes). */
  readonly units: number;
  readonly budget: PriceRange;
  /** Only `true` via `confirmBrief`. */
  readonly confirmed: boolean;
}

export type NotMatchedReason = "competency" | "price" | "unpublished" | "ranked";

export interface NotMatched {
  readonly expert: Expert;
  readonly reason: NotMatchedReason;
}

export type MatchResult =
  | {
      readonly kind: "match";
      readonly expert: Expert;
      readonly matchedCompetencies: readonly Competency[];
      readonly overlap: PriceRange;
      readonly explanation: readonly string[];
      readonly others: readonly NotMatched[];
    }
  | {
      readonly kind: "none";
      readonly reason: "competency" | "price";
      readonly explanation: string;
      readonly others: readonly NotMatched[];
    };

export interface ProposalDraft {
  readonly units: number;
  readonly pricePerUnit: number;
  readonly sent: boolean;
}

export interface Workflow {
  readonly name: string;
  readonly questions: readonly string[];
  readonly checks: readonly string[];
  readonly watchOuts: readonly string[];
  /** Only `approved` via `approveWorkflow` (FR-023). */
  readonly status: "proposed" | "approved";
}

export interface Engine {
  readonly workflows: readonly Workflow[];
  readonly sessionsCompleted: number;
  readonly earnings: number;
}

export type ReplyEffect =
  | { readonly kind: "renameCompetency"; readonly id: string; readonly label: string }
  | { readonly kind: "removeCompetency"; readonly id: string }
  | { readonly kind: "setPrice"; readonly range: PriceRange }
  | { readonly kind: "none" };

/** Something Margaret can say to the agent; same effect as the typed alternative. */
export interface SuggestedReply {
  readonly id: string;
  readonly text: string;
  /** The agent's acknowledgement. */
  readonly ack: string;
  readonly effect: ReplyEffect;
}

export interface Notice {
  readonly kind: "error" | "info";
  readonly text: string;
}
