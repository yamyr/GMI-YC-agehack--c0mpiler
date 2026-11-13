import { describe, expect, it } from "vitest";
import type { Translator } from "../../site/i18n/core.js";
import inventory from "../../site/i18n/messages/app.json";
import { PROPOSED_WORKFLOW, DEBRIEF_TURNS } from "../demo/script/debrief";
import { DEV_BRIEF, BRIEF_TURNS } from "../demo/script/dev";
import { OTHER_EXPERTS } from "../demo/script/experts";
import { INTERVIEW_TURNS, MARGARET_DRAFT, PROFILE_REPLIES, PRICE_REPLIES, PRICE_SUGGESTION } from "../demo/script/margaret";
import { scriptedServices } from "../demo/services/scripted";
import { createReducer, initialState } from "../demo/state/reducer";
import { seedBrief, seedExpert, seedReply, seedTurns, seedWorkflow } from "./seeds";

describe("authored seed localization boundary", () => {
  it("keeps source filenames so people can identify the original documents", () => {
    const localized = seedExpert(MARGARET_DRAFT, (source) => `FR: ${source}`);
    const sources = (expert: typeof MARGARET_DRAFT) => expert.competencies.map(({ source }) => source);
    expect(sources(localized)).toEqual(sources(MARGARET_DRAFT));
  });
  it("translates presentation fields while keeping names, IDs, tags, sources and numbers", () => {
    const dictionary: Readonly<Record<string, string>> = {
      "Contract manufacturing terms": "Conditions de fabrication sous contrat",
      "Retired procurement director · contract manufacturing and supplier negotiation": "Directrice des achats à la retraite",
    };
    const t: Translator = (source) => dictionary[source] ?? source;
    const expert = seedExpert(MARGARET_DRAFT, t);
    expect(expert.name).toBe("Margaret Okafor");
    expect(expert.location).toBe("Columbus, Ohio");
    expect(expert.id).toBe("margaret");
    expect(expert.age).toBe(68);
    expect(expert.yearsExperience).toBe(34);
    expect(expert.headline).toBe("Directrice des achats à la retraite");
    expect(expert.competencies[0]).toMatchObject({ id: "c1", tag: "contract-manufacturing", label: "Conditions de fabrication sous contrat", source: { kind: "interview", turn: 6 } });
    expect(seedBrief(DEV_BRIEF, t)).toMatchObject({ competencyTag: "contract-manufacturing", competencyLabel: "Conditions de fabrication sous contrat", units: 2, budget: { min: 50, max: 100 } });
    expect(MARGARET_DRAFT.competencies[0]?.label).toBe("Contract manufacturing terms");
  });

  it("inventories every authored field passed to seed translators", () => {
    const missing = new Set<string>();
    const inspect: Translator = (source) => { if (!inventory.includes(source)) missing.add(source); return source; };
    [MARGARET_DRAFT, ...OTHER_EXPERTS].forEach((expert) => seedExpert(expert, inspect));
    seedBrief(DEV_BRIEF, inspect);
    seedWorkflow(PROPOSED_WORKFLOW, inspect);
    seedTurns([...INTERVIEW_TURNS, ...BRIEF_TURNS, ...DEBRIEF_TURNS], inspect);
    [...PROFILE_REPLIES, ...PRICE_REPLIES].forEach((reply) => seedReply(reply, inspect));
    PRICE_SUGGESTION.reasons.forEach((reason) => inspect(reason));
    expect([...missing]).toEqual([]);
  });
});

describe("localized walkthrough state", () => {
  const reduce = createReducer(scriptedServices);

  it("retains locale on restart, chapter jumps and redoing the interview", () => {
    const initial = initialState(new Date(2026, 10, 13), "fr");
    const jumped = reduce(initial, { type: "jumpTo", chapter: "Match" });
    expect(jumped.locale).toBe("fr");
    expect(jumped.margaret.published).toBe(true);
    expect(jumped.margaret.priceRange).toEqual({ min: 60, max: 90 });
    const restarted = reduce(jumped, { type: "restart" });
    expect(restarted.locale).toBe("fr");
    expect(restarted.step).toBe(0);
    const redone = reduce(jumped, { type: "redoInterview" });
    expect(redone.locale).toBe("fr");
    expect(redone.margaret.published).toBe(false);
    expect(redone.now).toEqual(initial.now);
  });

  it("keeps localized reply targets and exchange buckets separate", () => {
    const initial = initialState(new Date(2026, 10, 13), "fr");
    const renamed = reduce(initial, { type: "replyToAgent", replyId: "profile-rename" });
    expect(renamed.margaret.competencies.map((skill) => skill.id)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(renamed.margaret.competencies[1]).toEqual(initial.margaret.competencies[1]);
    expect(renamed.exchanges.profile.map((turn) => turn.speaker)).toEqual(["margaret", "agent"]);
    expect(renamed.exchanges.price).toEqual([]);
    const priced = reduce(renamed, { type: "replyToAgent", replyId: "price-higher" });
    expect(priced.priceDraft).toEqual({ min: 65, max: 95 });
    expect(priced.exchanges.profile).toEqual(renamed.exchanges.profile);
    expect(priced.exchanges.price.map((turn) => turn.speaker)).toEqual(["margaret", "agent"]);
  });

  it("keeps user-authored text verbatim during validation and ordinary navigation", () => {
    let state = initialState(new Date(2026, 10, 13), "fr");
    state = reduce(state, { type: "editCompetency", id: "c1", label: "My personal skill — 自分の言葉" });
    state = reduce(state, { type: "editBrief", patch: { problem: "Mon texte personnel — supplier terms" } });
    state = reduce(state, { type: "confirmBrief" });
    state = reduce(state, { type: "next" });
    expect(state.margaret.competencies[0]?.label).toBe("My personal skill — 自分の言葉");
    expect(state.brief.problem).toBe("Mon texte personnel — supplier terms");
    expect(state.brief.confirmed).toBe(true);
  });
});
