import { describe, expect, it } from "vitest";
import { scriptedServices } from "../services/scripted";
import { CHAPTERS, STEPS } from "./steps";
import { type DemoAction, type DemoState, canAdvance, createReducer, initialState, stepInfo } from "./reducer";

const NOW = new Date(2026, 10, 11, 15, 0, 0);
const reduce = createReducer(scriptedServices);

function run(state: DemoState, ...actions: readonly DemoAction[]): DemoState {
  return actions.reduce(reduce, state);
}

function stepIndex(id: string): number {
  return STEPS.findIndex((step) => step.id === id);
}

/** Reveal every line of the conversation on the current step. */
function revealAll(state: DemoState): DemoState {
  let next = state;
  for (let i = 0; i < 20; i += 1) next = reduce(next, { type: "showNextTurn" });
  return next;
}

describe("foundation: steps and navigation", () => {
  it("starts on step 1 of 13, the start screen", () => {
    const state = initialState(NOW);
    expect(STEPS).toHaveLength(13);
    expect(stepInfo(state)).toMatchObject({ id: "start", number: 1, total: 13, chapter: null, persona: null });
  });

  it("lists the seven chapters in story order", () => {
    expect(CHAPTERS).toEqual([
      "Margaret onboards",
      "Price",
      "Dev's brief",
      "Match",
      "Book & pay",
      "Debrief",
      "Engine",
    ]);
  });

  it("moves forward with next only when the step allows it", () => {
    const onInterview = run(initialState(NOW), { type: "next" });
    expect(stepInfo(onInterview).id).toBe("interview");
    expect(canAdvance(onInterview)).toBe(false);
    expect(run(onInterview, { type: "next" })).toEqual(onInterview);
  });

  it("gates a conversation step until every line is shown, and stops at the last line", () => {
    const onInterview = run(initialState(NOW), { type: "next" });
    const total = onInterview.conversations.interview.turns.length;
    const oneShown = run(onInterview, { type: "showNextTurn" });
    expect(oneShown.conversations.interview.shown).toBe(1);
    expect(canAdvance(oneShown)).toBe(false);
    const allShown = revealAll(onInterview);
    expect(allShown.conversations.interview.shown).toBe(total);
    expect(canAdvance(allShown)).toBe(true);
    expect(stepInfo(run(allShown, { type: "next" })).id).toBe("profile");
  });

  it("does nothing on back from the first step", () => {
    const state = initialState(NOW);
    expect(run(state, { type: "back" })).toEqual(state);
  });

  it("keeps later progress when going back", () => {
    const onProfile = run(revealAll(run(initialState(NOW), { type: "next" })), { type: "next" });
    const back = run(onProfile, { type: "back" });
    expect(stepInfo(back).id).toBe("interview");
    expect(back.conversations.interview.shown).toBe(back.conversations.interview.turns.length);
  });

  it("restarts to a state equal to the initial state from any step", () => {
    const deep = run(initialState(NOW), { type: "jumpTo", chapter: "Engine" });
    expect(run(deep, { type: "restart" })).toEqual(initialState(NOW));
  });

  it("reports the chapter and persona of the current step", () => {
    const onBrief = run(initialState(NOW), { type: "jumpTo", chapter: "Dev's brief" });
    expect(stepInfo(onBrief)).toMatchObject({ id: "briefChat", number: 5, chapter: "Dev's brief", persona: "dev" });
  });

  it("lands on the first step of each chapter when jumping", () => {
    for (const chapter of CHAPTERS) {
      const state = run(initialState(NOW), { type: "jumpTo", chapter });
      const info = stepInfo(state);
      expect(info.chapter).toBe(chapter);
      expect(STEPS.findIndex((s) => s.chapter === chapter)).toBe(state.step);
    }
  });
});

describe("US1: Margaret onboards and prices", () => {
  const onProfile = (): DemoState => run(initialState(NOW), { type: "jumpTo", chapter: "Margaret onboards" }, ...Array<DemoAction>(20).fill({ type: "showNextTurn" }), { type: "next" });

  it("starts with an unpublished draft whose competencies all have a source", () => {
    const state = onProfile();
    expect(stepInfo(state).id).toBe("profile");
    expect(state.margaret.published).toBe(false);
    expect(state.margaret.competencies.length).toBeGreaterThanOrEqual(3);
    for (const competency of state.margaret.competencies) expect(competency.source).toBeDefined();
  });

  it("never publishes through next", () => {
    const state = run(onProfile(), { type: "next" }, { type: "next" });
    expect(state.margaret.published).toBe(false);
    expect(stepInfo(state).id).toBe("profile");
  });

  it("publishes only on publishProfile", () => {
    const state = run(onProfile(), { type: "publishProfile" });
    expect(state.margaret.published).toBe(true);
    expect(canAdvance(state)).toBe(true);
  });

  it("applies a suggested reply exactly like the typed alternative", () => {
    const base = onProfile();
    const viaReply = run(base, { type: "replyToAgent", replyId: "profile-rename" });
    const viaTyping = run(base, { type: "editCompetency", id: "c1", label: "Contract manufacturing negotiation" });
    expect(viaReply.margaret).toEqual(viaTyping.margaret);
    expect(viaReply.exchanges.profile.map((t) => t.speaker)).toEqual(["margaret", "agent"]);

    const removedByReply = run(base, { type: "replyToAgent", replyId: "profile-remove" });
    const removedByTyping = run(base, { type: "removeCompetency", id: "c4" });
    expect(removedByReply.margaret).toEqual(removedByTyping.margaret);
  });

  it("rejects an empty competency name with a message", () => {
    const state = run(onProfile(), { type: "editCompetency", id: "c1", label: "   " });
    expect(state.margaret.competencies[0]?.label).not.toBe("");
    expect(state.notice).toMatchObject({ kind: "error" });
  });

  it("blocks publishing with fewer than 3 competencies", () => {
    const state = run(
      onProfile(),
      { type: "removeCompetency", id: "c4" },
      { type: "removeCompetency", id: "c3" },
      { type: "publishProfile" },
    );
    expect(state.margaret.published).toBe(false);
    expect(state.notice?.text).toMatch(/at least 3/);
  });

  it("returns the profile to draft when a skill changes after publishing", () => {
    const state = run(onProfile(), { type: "publishProfile" }, { type: "editCompetency", id: "c2", label: "Negotiating with suppliers" });
    expect(state.margaret.published).toBe(false);
    expect(state.notice).toMatchObject({ kind: "info" });
  });

  it("redoes the interview without publishing anything", () => {
    const state = run(onProfile(), { type: "editCompetency", id: "c1", label: "Changed" }, { type: "redoInterview" });
    expect(stepInfo(state).id).toBe("interview");
    expect(state.conversations.interview.shown).toBe(0);
    expect(state.margaret).toEqual(initialState(NOW).margaret);
  });

  const onPrice = (): DemoState => run(initialState(NOW), { type: "jumpTo", chapter: "Price" });

  it("arrives at Price with a published profile and the $60–$90 suggestion unconfirmed", () => {
    const state = onPrice();
    expect(state.margaret.published).toBe(true);
    expect(state.priceDraft).toEqual({ min: 60, max: 90 });
    expect(state.priceConfirmed).toBe(false);
    expect(canAdvance(state)).toBe(false);
  });

  it("rejects an invalid range with an explanation and cannot confirm it", () => {
    const state = run(onPrice(), { type: "setPrice", range: { min: 95, max: 65 } });
    expect(state.priceDraft).toEqual({ min: 60, max: 90 });
    expect(state.notice?.text).toMatch(/higher/);
  });

  it("confirms the range Margaret names", () => {
    const viaReply = run(onPrice(), { type: "replyToAgent", replyId: "price-higher" }, { type: "confirmPrice" });
    const viaTyping = run(onPrice(), { type: "setPrice", range: { min: 65, max: 95 } }, { type: "confirmPrice" });
    expect(viaReply.margaret.priceRange).toEqual({ min: 65, max: 95 });
    expect(viaReply.margaret).toEqual(viaTyping.margaret);
    expect(canAdvance(viaReply)).toBe(true);
  });

  it("requires confirming again after changing a confirmed price", () => {
    const state = run(onPrice(), { type: "confirmPrice" }, { type: "setPrice", range: { min: 70, max: 90 } });
    expect(state.priceConfirmed).toBe(false);
    expect(state.margaret.priceRange).toBeNull();
  });
});

describe("US2: Dev's brief and the match", () => {
  const onBrief = (): DemoState => run(initialState(NOW), { type: "jumpTo", chapter: "Dev's brief" }, ...Array<DemoAction>(20).fill({ type: "showNextTurn" }), { type: "next" });

  it("drafts the scripted brief, unconfirmed", () => {
    const state = onBrief();
    expect(stepInfo(state).id).toBe("brief");
    expect(state.brief).toMatchObject({ competencyTag: "contract-manufacturing", units: 2, budget: { min: 50, max: 100 }, confirmed: false });
  });

  it("confirms only on confirmBrief", () => {
    expect(run(onBrief(), { type: "next" }).brief.confirmed).toBe(false);
    expect(run(onBrief(), { type: "confirmBrief" }).brief.confirmed).toBe(true);
  });

  it("refuses an empty problem, an invalid budget, or restricted advice", () => {
    const empty = run(onBrief(), { type: "editBrief", patch: { problem: "  " } }, { type: "confirmBrief" });
    expect(empty.brief.confirmed).toBe(false);
    expect(empty.notice?.kind).toBe("error");

    const budget = run(onBrief(), { type: "editBrief", patch: { budget: { min: 100, max: 50 } } }, { type: "confirmBrief" });
    expect(budget.brief.confirmed).toBe(false);

    const legal = run(onBrief(), { type: "editBrief", patch: { problem: "I need legal advice about suing my supplier." } }, { type: "confirmBrief" });
    expect(legal.brief.confirmed).toBe(false);
    expect(legal.notice?.text).toMatch(/legal advice/);
  });

  it("un-confirms the brief when it is edited", () => {
    const state = run(onBrief(), { type: "confirmBrief" }, { type: "editBrief", patch: { units: 3 } });
    expect(state.brief.confirmed).toBe(false);
  });

  it("can advance from Match only when Margaret is matched", () => {
    const onMatch = run(initialState(NOW), { type: "jumpTo", chapter: "Match" });
    expect(canAdvance(onMatch)).toBe(true);

    const back = run(onMatch, { type: "removeCompetency", id: "c1" }, { type: "publishProfile" });
    expect(back.margaret.published).toBe(true);
    expect(canAdvance(back)).toBe(false);
  });
});

describe("US3: book, pay, debrief, engine", () => {
  const onProposal = (): DemoState => run(initialState(NOW), { type: "jumpTo", chapter: "Book & pay" });

  it("starts the proposal at 2 × $75 and refuses prices outside the overlap", () => {
    const state = onProposal();
    expect(state.proposal).toEqual({ units: 2, pricePerUnit: 75, sent: false });
    const tooHigh = run(state, { type: "setProposalPrice", pricePerUnit: 95 }, { type: "sendProposal" });
    expect(tooHigh.proposal.sent).toBe(false);
    expect(tooHigh.notice?.text).toMatch(/\$60–\$90/);
  });

  it("books and holds payment only when Margaret accepts", () => {
    const sent = run(onProposal(), { type: "sendProposal" }, { type: "next" });
    expect(stepInfo(sent).id).toBe("accept");
    expect(sent.session).toBeNull();
    const accepted = run(sent, { type: "acceptProposal" });
    expect(accepted.session).toMatchObject({
      total: 150,
      units: 2,
      pricePerUnit: 75,
      status: "accepted",
      payment: { status: "held", amount: 150, demo: true },
      call: { isDemo: true, provider: "Google Meet" },
    });
    expect(accepted.session?.startsAt).toEqual(new Date(2026, 10, 13, 10, 0, 0));
  });

  it("holds nothing on decline and sends Dev back to propose again", () => {
    const declined = run(onProposal(), { type: "sendProposal" }, { type: "next" }, { type: "declineProposal" });
    expect(declined.session).toBeNull();
    expect(declined.proposal.sent).toBe(false);
    expect(stepInfo(declined).id).toBe("proposal");
    expect(declined.notice?.text).toMatch(/declined/);
  });

  it("releases payment when the session is marked as held", () => {
    const onSession = run(initialState(NOW), { type: "jumpTo", chapter: "Book & pay" }, { type: "sendProposal" }, { type: "next" }, { type: "acceptProposal" }, { type: "next" });
    expect(stepInfo(onSession).id).toBe("session");
    const held = run(onSession, { type: "markSessionHeld" });
    expect(held.session).toMatchObject({ status: "held", payment: { status: "released" } });
  });

  it("adds the workflow to the engine only after approval", () => {
    const onWorkflow = run(initialState(NOW), { type: "jumpTo", chapter: "Debrief" }, ...Array<DemoAction>(20).fill({ type: "showNextTurn" }), { type: "next" });
    expect(stepInfo(onWorkflow).id).toBe("workflow");
    expect(onWorkflow.workflow.status).toBe("proposed");
    expect(run(onWorkflow, { type: "next" }).workflow.status).toBe("proposed");
    expect(run(onWorkflow, { type: "approveWorkflow" }).workflow.status).toBe("approved");
  });

  it("jumping to Engine equals clicking through the happy path (invariant 8)", () => {
    const clicked = run(
      initialState(NOW),
      { type: "next" },
      ...Array<DemoAction>(20).fill({ type: "showNextTurn" }),
      { type: "next" },
      { type: "publishProfile" },
      { type: "next" },
      { type: "confirmPrice" },
      { type: "next" },
      ...Array<DemoAction>(20).fill({ type: "showNextTurn" }),
      { type: "next" },
      { type: "confirmBrief" },
      { type: "next" },
      { type: "next" },
      { type: "sendProposal" },
      { type: "next" },
      { type: "acceptProposal" },
      { type: "next" },
      { type: "markSessionHeld" },
      { type: "next" },
      ...Array<DemoAction>(20).fill({ type: "showNextTurn" }),
      { type: "next" },
      { type: "approveWorkflow" },
      { type: "next" },
    );
    expect(stepInfo(clicked).id).toBe("engine");
    expect(run(initialState(NOW), { type: "jumpTo", chapter: "Engine" })).toEqual(clicked);
  });

  it("navigation and conversation actions never make a decision for anyone (invariant 1)", () => {
    const neutral: readonly DemoAction[] = [{ type: "next" }, { type: "back" }, { type: "showNextTurn" }];
    let state = initialState(NOW);
    for (let i = 0; i < 60; i += 1) state = reduce(state, neutral[i % neutral.length] as DemoAction);
    expect(state.margaret.published).toBe(false);
    expect(state.priceConfirmed).toBe(false);
    expect(state.brief.confirmed).toBe(false);
    expect(state.proposal.sent).toBe(false);
    expect(state.session).toBeNull();
    expect(state.workflow.status).toBe("proposed");
    expect(stepIndex(stepInfo(state).id)).toBeLessThanOrEqual(stepIndex("profile"));
  });
});

describe("002: live conversations", () => {
  const TURN = { message: "Tell me about your career.", options: ["One", "Two", "Three"], done: false };
  const live = (state: DemoState) => run(state, { type: "setLiveEnabled", enabled: true });
  const onInterview = () => run(live(initialState(NOW)), { type: "next" });

  it("is off by default and can be switched on", () => {
    expect(initialState(NOW).live.enabled).toBe(false);
    expect(live(initialState(NOW)).live.enabled).toBe(true);
  });

  it("gates a live conversation step on the live conversation ending", () => {
    let state = run(onInterview(), { type: "liveRequest", conversation: "interview" });
    const id = state.live.conversations.interview.pending?.requestId ?? -1;
    state = run(state, { type: "liveTurnReceived", conversation: "interview", requestId: id, turn: TURN });
    expect(canAdvance(state)).toBe(false);
    state = run(state, { type: "liveReply", conversation: "interview", text: "I ran procurement." });
    expect(state.live.conversations.interview.pending).not.toBeNull();
    const second = state.live.conversations.interview.pending?.requestId ?? -1;
    state = run(state, { type: "liveTurnReceived", conversation: "interview", requestId: second, turn: TURN });
    state = run(state, { type: "liveFinish", conversation: "interview" });
    expect(canAdvance(state)).toBe(true);
    expect(stepInfo(run(state, { type: "next" })).id).toBe("profile");
  });

  it("ignores a response for a request that is no longer pending", () => {
    const state = run(onInterview(), { type: "liveRequest", conversation: "interview" });
    const stale = run(state, { type: "liveTurnReceived", conversation: "interview", requestId: 999, turn: TURN });
    expect(stale).toEqual(state);
  });

  it("falls back to the scripted conversation and its gating", () => {
    const state = run(onInterview(), { type: "liveUseScripted", conversation: "interview" });
    expect(state.live.conversations.interview.mode).toBe("scripted");
    expect(canAdvance(state)).toBe(false);
    expect(canAdvance(revealAll(state))).toBe(true);
  });

  it("uses scripted gating when live mode is off", () => {
    const state = run(initialState(NOW), { type: "next" });
    expect(canAdvance(revealAll(state))).toBe(true);
  });

  it("discards pending turns on restart and keeps live mode on", () => {
    const pending = run(onInterview(), { type: "liveRequest", conversation: "interview" });
    const restarted = run(pending, { type: "restart" });
    expect(restarted.live.enabled).toBe(true);
    expect(restarted.live.conversations.interview).toMatchObject({ lines: [], pending: null });
    expect(restarted.live.nextRequestId).toBeGreaterThan(1);
  });

  it("puts earlier conversations in scripted mode when jumping in live mode", () => {
    const state = run(live(initialState(NOW)), { type: "jumpTo", chapter: "Debrief" });
    expect(state.live.conversations.interview.mode).toBe("scripted");
    expect(state.live.conversations.brief.mode).toBe("scripted");
    expect(state.live.conversations.debrief.mode).toBe("live");
    expect(canAdvance(run(state, { type: "back" }))).toBe(true);
  });
});

describe("002: live mode arriving mid-walkthrough", () => {
  it("leaves a conversation that already started from the script scripted", () => {
    const started = run(initialState(NOW), { type: "next" }, { type: "showNextTurn" });
    const enabled = run(started, { type: "setLiveEnabled", enabled: true });
    expect(enabled.live.conversations.interview.mode).toBe("scripted");
    expect(enabled.live.conversations.brief.mode).toBe("live");
  });
});
