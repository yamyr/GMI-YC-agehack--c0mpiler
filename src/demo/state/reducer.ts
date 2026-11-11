import { detectRestrictedAdvice, restrictedAdviceMessage } from "../domain/advice";
import { matchBrief } from "../domain/match";
import { validateRange } from "../domain/price";
import { proposalTotal, validateProposal } from "../domain/proposal";
import type {
  Brief,
  Conversation,
  ConversationId,
  ConversationTurn,
  Engine,
  Expert,
  MatchResult,
  Notice,
  PriceRange,
  ProposalDraft,
  SuggestedReply,
  Workflow,
} from "../domain/types";
import { DEBRIEF_TURNS, PROPOSED_WORKFLOW } from "../script/debrief";
import { BRIEF_TURNS, DEV_BRIEF } from "../script/dev";
import { OTHER_EXPERTS } from "../script/experts";
import { INTERVIEW_TURNS, MARGARET_DRAFT, PRICE_REPLIES, PRICE_SUGGESTION, PROFILE_REPLIES } from "../script/margaret";
import { emptyLive, failTurn, finish, receiveTurn, reply, requestTurn, useScripted } from "../live/state";
import type { AgentTurn, LiveConversation } from "../live/types";
import type { DemoServices, MeetingLink, PaymentHold } from "../services/types";
import { sessionStart } from "./dates";
import { type Chapter, type StepId, STEPS, firstStepOf, stepIndexOf } from "./steps";

/** A booked session (data-model.md › Session). */
export interface Session {
  readonly id: string;
  readonly startsAt: Date;
  readonly units: number;
  readonly pricePerUnit: number;
  readonly total: number;
  readonly call: MeetingLink;
  readonly status: "accepted" | "held";
  readonly payment: PaymentHold;
}

export interface DemoState {
  /** Index into STEPS. */
  readonly step: number;
  /** "Today" for the walkthrough; fixed for the whole run so restart and jump are deterministic. */
  readonly now: Date;
  readonly conversations: Readonly<Record<ConversationId, Conversation>>;
  readonly margaret: Expert;
  /** What Margaret said to the agent on the profile and price steps, with the agent's replies. */
  readonly exchanges: { readonly profile: readonly ConversationTurn[]; readonly price: readonly ConversationTurn[] };
  readonly priceDraft: PriceRange;
  readonly priceConfirmed: boolean;
  readonly brief: Brief;
  readonly proposal: ProposalDraft;
  readonly session: Session | null;
  readonly workflow: Workflow;
  readonly notice: Notice | null;
  /** Spec 002: live agent conversations. */
  readonly live: LiveState;
}

export interface LiveState {
  /** Ready and not turned off by the presenter (FR-002, FR-004). */
  readonly enabled: boolean;
  /** Monotonic across restarts and jumps so a late response can never match a new request. */
  readonly nextRequestId: number;
  readonly conversations: Readonly<Record<ConversationId, LiveConversation>>;
}

/** contracts/demo-actions.md */
export type DemoAction =
  | { readonly type: "next" }
  | { readonly type: "back" }
  | { readonly type: "restart" }
  | { readonly type: "jumpTo"; readonly chapter: Chapter }
  | { readonly type: "showNextTurn" }
  | { readonly type: "replyToAgent"; readonly replyId: string }
  | { readonly type: "editCompetency"; readonly id: string; readonly label: string }
  | { readonly type: "removeCompetency"; readonly id: string }
  | { readonly type: "redoInterview" }
  | { readonly type: "publishProfile" }
  | { readonly type: "setPrice"; readonly range: PriceRange }
  | { readonly type: "confirmPrice" }
  | { readonly type: "editBrief"; readonly patch: Partial<Pick<Brief, "problem" | "units" | "budget">> }
  | { readonly type: "confirmBrief" }
  | { readonly type: "setProposalUnits"; readonly units: number }
  | { readonly type: "setProposalPrice"; readonly pricePerUnit: number }
  | { readonly type: "sendProposal" }
  | { readonly type: "acceptProposal" }
  | { readonly type: "declineProposal" }
  | { readonly type: "markSessionHeld" }
  | { readonly type: "approveWorkflow" }
  // spec 002: live agent
  | { readonly type: "setLiveEnabled"; readonly enabled: boolean }
  | { readonly type: "liveRequest"; readonly conversation: ConversationId }
  | { readonly type: "liveTurnReceived"; readonly conversation: ConversationId; readonly requestId: number; readonly turn: AgentTurn }
  | { readonly type: "liveTurnFailed"; readonly conversation: ConversationId; readonly requestId: number; readonly message: string }
  | { readonly type: "liveReply"; readonly conversation: ConversationId; readonly text: string }
  | { readonly type: "liveFinish"; readonly conversation: ConversationId }
  | { readonly type: "liveUseScripted"; readonly conversation: ConversationId };

const MIN_PUBLISHED_SKILLS = 3;
const MAX_UNITS = 4;

function conversation(id: ConversationId, turns: readonly ConversationTurn[]): Conversation {
  return { id, turns, shown: 0 };
}

function freshLive(enabled: boolean, nextRequestId: number): LiveState {
  return {
    enabled,
    nextRequestId,
    conversations: { interview: emptyLive("live"), brief: emptyLive("live"), debrief: emptyLive("live") },
  };
}

export function initialState(now: Date): DemoState {
  return {
    step: 0,
    now,
    conversations: {
      interview: conversation("interview", INTERVIEW_TURNS),
      brief: conversation("brief", BRIEF_TURNS),
      debrief: conversation("debrief", DEBRIEF_TURNS),
    },
    margaret: MARGARET_DRAFT,
    exchanges: { profile: [], price: [] },
    priceDraft: PRICE_SUGGESTION.range,
    priceConfirmed: false,
    brief: DEV_BRIEF,
    proposal: { units: DEV_BRIEF.units, pricePerUnit: 75, sent: false },
    session: null,
    workflow: PROPOSED_WORKFLOW,
    notice: null,
    live: freshLive(false, 1),
  };
}

/** The conversation runs live: live mode is on and the presenter hasn't fallen back to the script. */
export function isLiveActive(state: DemoState, id: ConversationId): boolean {
  return state.live.enabled && state.live.conversations[id].mode === "live";
}

/** A live conversation actually happened (drives the "scripted draft" notes, FR-013). */
export function wasLive(state: DemoState, id: ConversationId): boolean {
  const c = state.live.conversations[id];
  return c.mode === "live" && c.lines.length > 0;
}

// ── Derived values ──────────────────────────────────────────────────────────

export function currentMatch(state: DemoState): MatchResult {
  return matchBrief(state.brief, [state.margaret, ...OTHER_EXPERTS]);
}

export function deriveEngine(state: DemoState): Engine {
  const held = state.session?.status === "held" && state.session.payment.status === "released";
  return {
    workflows: state.workflow.status === "approved" ? [state.workflow] : [],
    sessionsCompleted: held ? 1 : 0,
    earnings: held && state.session !== null ? state.session.total : 0,
  };
}

function conversationDone(state: DemoState, id: ConversationId): boolean {
  if (isLiveActive(state, id)) return state.live.conversations[id].ended;
  const c = state.conversations[id];
  return c.shown >= c.turns.length;
}

/** Whether Next is enabled: each step waits for its own human decision. */
export function canAdvance(state: DemoState): boolean {
  const id = STEPS[state.step]?.id;
  switch (id) {
    case "start":
      return true;
    case "interview":
      return conversationDone(state, "interview");
    case "profile":
      return state.margaret.published;
    case "price":
      return state.priceConfirmed;
    case "briefChat":
      return conversationDone(state, "brief");
    case "brief":
      return state.brief.confirmed;
    case "match":
      return currentMatch(state).kind === "match";
    case "proposal":
      return state.proposal.sent;
    case "accept":
      return state.session !== null;
    case "session":
      return state.session?.status === "held";
    case "debrief":
      return conversationDone(state, "debrief");
    case "workflow":
      return state.workflow.status === "approved";
    default:
      return false;
  }
}

const BLOCKED_REASONS: Readonly<Record<StepId, string>> = {
  start: "",
  interview: "Show every line of the conversation first.",
  profile: "Margaret needs to publish her profile first.",
  price: "Margaret needs to confirm her price first.",
  briefChat: "Show every line of the conversation first.",
  brief: "Dev needs to confirm his brief first.",
  match: "There is no match to continue with.",
  proposal: "Dev needs to send his proposal first.",
  accept: "Margaret needs to answer the proposal first.",
  session: "Mark the session as held first.",
  debrief: "Show every line of the conversation first.",
  workflow: "Margaret needs to approve the workflow first.",
  engine: "This is the end of the walkthrough.",
};

export function blockedReason(state: DemoState): string | null {
  if (canAdvance(state)) return null;
  const step = STEPS[state.step];
  return step === undefined ? null : BLOCKED_REASONS[step.id];
}

export function stepInfo(state: DemoState) {
  const step = STEPS[state.step] ?? STEPS[0];
  if (step === undefined) throw new Error("no steps defined");
  return {
    id: step.id,
    title: step.title,
    number: state.step + 1,
    total: STEPS.length,
    chapter: step.chapter,
    persona: step.persona,
  };
}

// ── Reducer ─────────────────────────────────────────────────────────────────

/** Scripted human decisions replayed by `jumpTo` for every step before the target (research R2). */
const REVEAL_ALL: readonly DemoAction[] = Array.from({ length: 20 }, () => ({ type: "showNextTurn" }) as const);
const STEP_DEFAULTS: Readonly<Record<StepId, readonly DemoAction[]>> = {
  start: [],
  interview: REVEAL_ALL,
  profile: [{ type: "publishProfile" }],
  price: [{ type: "confirmPrice" }],
  briefChat: REVEAL_ALL,
  brief: [{ type: "confirmBrief" }],
  match: [],
  proposal: [{ type: "sendProposal" }],
  accept: [{ type: "acceptProposal" }],
  session: [{ type: "markSessionHeld" }],
  debrief: REVEAL_ALL,
  workflow: [{ type: "approveWorkflow" }],
  engine: [],
};

const ALL_REPLIES: readonly SuggestedReply[] = [...PROFILE_REPLIES, ...PRICE_REPLIES];

function withLive(state: DemoState, id: ConversationId, c: LiveConversation, nextRequestId = state.live.nextRequestId): DemoState {
  return { ...state, live: { ...state.live, nextRequestId, conversations: { ...state.live.conversations, [id]: c } } };
}

function error(state: DemoState, text: string): DemoState {
  return { ...state, notice: { kind: "error", text } };
}

/** Invariant 6: a skill change after publishing sends the profile back to draft. */
function withCompetencies(state: DemoState, competencies: Expert["competencies"]): DemoState {
  const wasPublished = state.margaret.published;
  return {
    ...state,
    margaret: { ...state.margaret, competencies, published: false },
    notice: wasPublished
      ? { kind: "info", text: "Your profile is back to draft. Publish it again when you're happy with it." }
      : null,
  };
}

export function createReducer(services: DemoServices) {
  function reduce(state: DemoState, action: DemoAction): DemoState {
    switch (action.type) {
      case "next":
        if (!canAdvance(state) || state.step >= STEPS.length - 1) return state;
        return { ...state, step: state.step + 1, notice: null };

      case "back":
        if (state.step === 0) return state;
        return { ...state, step: state.step - 1, notice: null };

      case "restart":
        return { ...initialState(state.now), live: freshLive(state.live.enabled, state.live.nextRequestId) };

      case "jumpTo": {
        const target = firstStepOf(action.chapter);
        let next: DemoState = { ...initialState(state.now), live: freshLive(state.live.enabled, state.live.nextRequestId) };
        for (let i = 0; i < target; i += 1) {
          const step = STEPS[i];
          if (step === undefined) break;
          if (step.conversation !== undefined && next.live.enabled) {
            // Jumping past a conversation fills it from the script, not the live agent.
            next = withLive(next, step.conversation, useScripted(next.live.conversations[step.conversation]));
          }
          next = STEP_DEFAULTS[step.id].reduce(reduce, { ...next, step: i });
        }
        return { ...next, step: target, notice: null };
      }

      case "showNextTurn": {
        const id = STEPS[state.step]?.conversation;
        if (id === undefined) return state;
        const c = state.conversations[id];
        if (c.shown >= c.turns.length) return state;
        return { ...state, conversations: { ...state.conversations, [id]: { ...c, shown: c.shown + 1 } } };
      }

      case "replyToAgent": {
        const reply = ALL_REPLIES.find((r) => r.id === action.replyId);
        if (reply === undefined) return state;
        const effect = reply.effect;
        const applied =
          effect.kind === "renameCompetency"
            ? reduce(state, { type: "editCompetency", id: effect.id, label: effect.label })
            : effect.kind === "removeCompetency"
              ? reduce(state, { type: "removeCompetency", id: effect.id })
              : effect.kind === "setPrice"
                ? reduce(state, { type: "setPrice", range: effect.range })
                : { ...state, notice: null };
        if (applied.notice?.kind === "error") return applied;
        const bucket = PROFILE_REPLIES.includes(reply) ? "profile" : "price";
        const turns: readonly ConversationTurn[] = [
          ...applied.exchanges[bucket],
          { speaker: "margaret", text: reply.text },
          { speaker: "agent", text: reply.ack },
        ];
        return { ...applied, exchanges: { ...applied.exchanges, [bucket]: turns } };
      }

      case "editCompetency": {
        const label = action.label.trim();
        if (label === "") return error(state, "A skill needs a name. Type a few words, or remove the skill instead.");
        if (!state.margaret.competencies.some((c) => c.id === action.id)) {
          return error(state, "That skill isn't on the profile any more.");
        }
        return withCompetencies(
          state,
          state.margaret.competencies.map((c) => (c.id === action.id ? { ...c, label } : c)),
        );
      }

      case "removeCompetency":
        if (!state.margaret.competencies.some((c) => c.id === action.id)) {
          return error(state, "That skill isn't on the profile any more.");
        }
        return withCompetencies(
          state,
          state.margaret.competencies.filter((c) => c.id !== action.id),
        );

      case "redoInterview": {
        const fresh = initialState(state.now);
        return {
          ...state,
          step: stepIndexOf("interview"),
          conversations: { ...state.conversations, interview: fresh.conversations.interview },
          margaret: fresh.margaret,
          exchanges: fresh.exchanges,
          priceDraft: fresh.priceDraft,
          priceConfirmed: false,
          notice: null,
        };
      }

      case "publishProfile":
        if (state.margaret.competencies.length < MIN_PUBLISHED_SKILLS) {
          return error(state, `Keep at least ${MIN_PUBLISHED_SKILLS} skills on your profile before publishing.`);
        }
        return { ...state, margaret: { ...state.margaret, published: true }, notice: null };

      case "setPrice": {
        const check = validateRange(action.range);
        if (!check.ok) return error(state, check.message);
        return {
          ...state,
          priceDraft: check.range,
          priceConfirmed: false,
          margaret: { ...state.margaret, priceRange: null },
          notice: null,
        };
      }

      case "confirmPrice":
        return {
          ...state,
          priceConfirmed: true,
          margaret: { ...state.margaret, priceRange: state.priceDraft },
          notice: null,
        };

      case "editBrief":
        return { ...state, brief: { ...state.brief, ...action.patch, confirmed: false }, notice: null };

      case "confirmBrief": {
        const { brief } = state;
        if (brief.problem.trim() === "") return error(state, "Describe the problem in a sentence first.");
        if (!Number.isInteger(brief.units) || brief.units < 1 || brief.units > MAX_UNITS) {
          return error(state, "Choose a length between 15 and 60 minutes.");
        }
        const budget = validateRange(brief.budget);
        if (!budget.ok) return error(state, budget.message);
        const advice = detectRestrictedAdvice(brief.problem);
        if (advice !== null) return error(state, restrictedAdviceMessage(advice));
        return {
          ...state,
          brief: { ...brief, confirmed: true },
          proposal: { ...state.proposal, units: brief.units, sent: false },
          notice: null,
        };
      }

      case "setProposalUnits":
        if (!Number.isInteger(action.units) || action.units < 1 || action.units > MAX_UNITS) return state;
        return { ...state, proposal: { ...state.proposal, units: action.units, sent: false }, notice: null };

      case "setProposalPrice":
        return { ...state, proposal: { ...state.proposal, pricePerUnit: action.pricePerUnit, sent: false }, notice: null };

      case "sendProposal": {
        const match = currentMatch(state);
        if (match.kind !== "match") return error(state, "There is no match to send a proposal to.");
        const check = validateProposal(state.proposal.pricePerUnit, match.overlap);
        if (!check.ok) return error(state, check.message);
        return { ...state, proposal: { ...state.proposal, sent: true }, notice: null };
      }

      case "acceptProposal": {
        if (!state.proposal.sent || state.session !== null) return state;
        const { units, pricePerUnit } = state.proposal;
        const total = proposalTotal(units, pricePerUnit);
        const id = "s1";
        return {
          ...state,
          session: {
            id,
            startsAt: sessionStart(state.now),
            units,
            pricePerUnit,
            total,
            call: services.meetings.createLink(id),
            status: "accepted",
            payment: services.payments.hold(total),
          },
          notice: null,
        };
      }

      case "declineProposal":
        if (!state.proposal.sent || state.session !== null) return state;
        return {
          ...state,
          step: stepIndexOf("proposal"),
          proposal: { ...state.proposal, sent: false },
          notice: { kind: "info", text: "Margaret declined this time. Nothing was booked or charged. You can propose again." },
        };

      case "markSessionHeld":
        if (state.session === null || state.session.status !== "accepted") return state;
        return {
          ...state,
          session: { ...state.session, status: "held", payment: services.payments.release(state.session.payment) },
          notice: null,
        };

      case "approveWorkflow":
        return { ...state, workflow: { ...state.workflow, status: "approved" }, notice: null };

      case "setLiveEnabled": {
        if (state.live.enabled === action.enabled) return state;
        let next: DemoState = { ...state, live: { ...state.live, enabled: action.enabled } };
        if (action.enabled) {
          // A conversation the presenter already started from the script stays scripted.
          for (const id of ["interview", "brief", "debrief"] as const) {
            const c = next.live.conversations[id];
            if (state.conversations[id].shown > 0 && c.lines.length === 0) next = withLive(next, id, useScripted(c));
          }
        }
        return next;
      }

      case "liveRequest": {
        const c = state.live.conversations[action.conversation];
        if (c.pending !== null || c.ended || c.mode !== "live") return state;
        const id = state.live.nextRequestId;
        return withLive(state, action.conversation, requestTurn(c, id), id + 1);
      }

      case "liveTurnReceived": {
        const c = state.live.conversations[action.conversation];
        const next = receiveTurn(c, action.requestId, action.turn);
        return next === c ? state : withLive(state, action.conversation, next);
      }

      case "liveTurnFailed": {
        const c = state.live.conversations[action.conversation];
        const next = failTurn(c, action.requestId, action.message);
        return next === c ? state : withLive(state, action.conversation, next);
      }

      case "liveReply": {
        const id = state.live.nextRequestId;
        const next = reply(state.live.conversations[action.conversation], action.text, id);
        return next === null ? state : withLive(state, action.conversation, next, id + 1);
      }

      case "liveFinish":
        return withLive(state, action.conversation, finish(state.live.conversations[action.conversation]));

      case "liveUseScripted":
        return withLive(state, action.conversation, useScripted(state.live.conversations[action.conversation]));
    }
  }
  return reduce;
}
