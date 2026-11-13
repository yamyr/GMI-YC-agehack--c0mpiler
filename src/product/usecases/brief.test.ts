import { describe, expect, it } from "vitest";
import { createTranslator } from "../../../site/i18n/core.js";
import type { ExpertProfile } from "../model/types";
import type { InterviewAnswer } from "../ports";
import { chooseRole, signOut } from "./account";
import { confirmBrief, draftBriefFromConversation, myBrief, myCurrentBrief, updateBrief } from "./brief";
import { localizeStoredMatch, myMatch, runMatch } from "./match";
import { type TestWorld, testWorld } from "./testing";

const ANSWERS: readonly InterviewAnswer[] = [
  { questionId: "problem", text: "I'm about to sign with a contract manufacturer for the first time." },
  { questionId: "length", text: "30 minutes" },
  { questionId: "budget", text: "$50 to $100" },
];

async function seedExpert(world: TestWorld, id: string, name: string, over: Partial<ExpertProfile> & { tags: readonly string[] }): Promise<void> {
  const { tags, ...rest } = over;
  await world.ctx.ports.store.put("account", { id, email: `${id}@example.com`, name, roles: ["expert"], activeRole: "expert", createdAt: "2026-11-01T00:00:00.000Z" });
  await world.ctx.ports.store.put("profile", {
    id,
    headline: `${name}'s headline`,
    location: "",
    yearsExperience: 30,
    skills: tags.map((tag, i) => ({ id: `${id}-s${i}`, tag, label: tag, description: "", source: { kind: "interview", turn: 1 } })),
    exampleProblems: [],
    priceRange: { min: 60, max: 90 },
    priceConfirmed: true,
    state: "published",
    selfDeclared: true,
    ...rest,
  });
}

async function threeExperts(world: TestWorld): Promise<void> {
  await seedExpert(world, "ruth", "Ruth Adeyemi", { tags: ["contract-manufacturing", "supplier-negotiation"], yearsExperience: 34 });
  await seedExpert(world, "harold", "Harold Brooks", { tags: ["hospital-operations"], priceRange: { min: 40, max: 60 } });
  await seedExpert(world, "lin", "Lin Zhao", { tags: ["contract-manufacturing"], priceRange: { min: 120, max: 160 }, yearsExperience: 38 });
}

async function buyer(world: TestWorld, email = "sam@example.com"): Promise<string> {
  const id = await world.signInAs(email);
  await chooseRole(world.ctx, "buyer");
  return id;
}

async function confirmedBrief(world: TestWorld): Promise<string> {
  const drafted = await draftBriefFromConversation(world.ctx, ANSWERS);
  if (!drafted.ok) throw new Error(drafted.error);
  const confirmed = await confirmBrief(world.ctx, drafted.value.id);
  if (!confirmed.ok) throw new Error(confirmed.error);
  return drafted.value.id;
}

describe("a buyer's brief", () => {
  it("is drafted from the conversation and saved as a draft", async () => {
    const world = testWorld();
    const sam = await buyer(world);
    const result = await draftBriefFromConversation(world.ctx, ANSWERS);
    expect(result).toMatchObject({ ok: true, value: { buyerId: sam, skillTag: "contract-manufacturing", units: 2, budget: { min: 50, max: 100 }, state: "draft", createdAt: "2026-11-14T12:00:00.000Z" } });
    expect(await myCurrentBrief(world.ctx)).toEqual(result);
  });

  it("recognizes and preserves a typed brief in the selected language", async () => {
    const world = testWorld();
    await buyer(world);
    const problem = "J'ai besoin d'aide avec la négociation avec les fournisseurs.";
    const result = await draftBriefFromConversation(world.ctx, [
      { questionId: "problem", text: problem },
      { questionId: "length", text: "45 minutes" },
      { questionId: "budget", text: "50 à 100 dollars" },
    ], "fr");

    expect(result).toMatchObject({ ok: true, value: { problem, skillTag: "supplier-negotiation", units: 3, budget: { min: 50, max: 100 } } });
  });

  it("uses each typed answer's language when the buyer switches languages mid-conversation", async () => {
    const world = testWorld();
    await buyer(world);
    const problem = "J'ai besoin d'aide avec la négociation avec les fournisseurs.";
    const result = await draftBriefFromConversation(world.ctx, [
      { questionId: "problem", text: problem, locale: "fr" },
      { questionId: "length", text: "१ घंटा", locale: "hi" },
      { questionId: "budget", text: "$50 to $80", locale: "en" },
    ], "en");

    expect(result).toMatchObject({ ok: true, value: { problem, skillTag: "supplier-negotiation", units: 4, budget: { min: 50, max: 80 } } });
  });

  it("preserves quantities entered using Hindi digits", async () => {
    const world = testWorld();
    await buyer(world);
    const result = await draftBriefFromConversation(world.ctx, [
      { questionId: "problem", text: "आपूर्तिकर्ता से बातचीत में मदद चाहिए।" },
      { questionId: "length", text: "४५ मिनट" },
      { questionId: "budget", text: "५० से ८० अमेरिकी डॉलर" },
    ], "hi");

    expect(result).toMatchObject({ ok: true, value: { skillTag: "supplier-negotiation", units: 3, budget: { min: 50, max: 80 } } });
  });

  it.each([
    ["fr", "1 heure 15 minutes", 5],
    ["hi", "१ घंटा", 4],
    ["fr", "45", 3],
    ["fr", "1 minute", 1],
  ] as const)("interprets duration in %s for %s", async (locale, length, units) => {
    const world = testWorld();
    await buyer(world);
    const result = await draftBriefFromConversation(world.ctx, [
      ANSWERS[0] ?? { questionId: "problem", text: "Help with contract manufacturing" },
      { questionId: "length", text: length },
    ], locale);

    expect(result).toMatchObject({ ok: true, value: { units } });
  });

  it.each(["en", "tl"] as const)("uses an exact catalogue label over overlapping keywords in %s", async (locale) => {
    const world = testWorld();
    await buyer(world);
    const text = createTranslator(locale)("Supplier quality audits").toLocaleUpperCase(locale);
    const result = await draftBriefFromConversation(world.ctx, [{ questionId: "problem", text }], locale);

    expect(result).toMatchObject({ ok: true, value: { skillTag: "supplier-audits" } });
  });

  it("is not saved when the problem names no skill Agely knows", async () => {
    const world = testWorld();
    await buyer(world);
    expect(await draftBriefFromConversation(world.ctx, [{ questionId: "problem", text: "I want to learn to juggle." }])).toEqual({ ok: false, error: "unmatched" });
    expect(await myCurrentBrief(world.ctx)).toEqual({ ok: true, value: null });
  });

  it("can be edited, which makes a confirmed brief a draft again and forgets its match", async () => {
    const world = testWorld();
    await threeExperts(world);
    await buyer(world);
    const id = await confirmedBrief(world);
    await runMatch(world.ctx, id);
    const edited = await updateBrief(world.ctx, id, { problem: " Review my manufacturing contract ", units: 3, budget: { min: 70, max: 80 } });
    expect(edited).toMatchObject({ ok: true, value: { problem: "Review my manufacturing contract", units: 3, budget: { min: 70, max: 80 }, state: "draft" } });
    expect(await myMatch(world.ctx, id)).toEqual({ ok: true, value: null });
  });

  it("refuses edits that are not a real brief", async () => {
    const world = testWorld();
    await buyer(world);
    const id = (await draftBriefFromConversation(world.ctx, ANSWERS).then((r) => (r.ok ? r.value.id : ""))) as string;
    for (const bad of [{ problem: "  " }, { units: 0 }, { units: 9 }, { units: 1.5 }, { budget: { min: 90, max: 60 } }]) {
      expect(await updateBrief(world.ctx, id, bad)).toEqual({ ok: false, error: "invalid-brief" });
    }
  });

  it("is confirmed only by the buyer's own act, and not when it asks for regulated advice", async () => {
    const world = testWorld();
    await buyer(world);
    const drafted = await draftBriefFromConversation(world.ctx, ANSWERS);
    if (!drafted.ok) throw new Error("no draft");
    expect(drafted.value.state).toBe("draft");
    await updateBrief(world.ctx, drafted.value.id, { problem: "I need legal advice on my manufacturing contract" });
    expect(await confirmBrief(world.ctx, drafted.value.id)).toEqual({ ok: false, error: "restricted-advice", category: "legal" });
    await updateBrief(world.ctx, drafted.value.id, { problem: "Review the commercial terms of my manufacturing contract" });
    expect(await confirmBrief(world.ctx, drafted.value.id)).toMatchObject({ ok: true, value: { state: "confirmed" } });
  });

  it("belongs to its buyer alone", async () => {
    const world = testWorld();
    await buyer(world, "sam@example.com");
    const id = await confirmedBrief(world);
    await signOut(world.ctx);
    await buyer(world, "ana@example.com");
    expect(await myBrief(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    expect(await myBrief(world.ctx, "no-such-brief")).toEqual({ ok: false, error: "not-yours" });
    expect(await updateBrief(world.ctx, id, { units: 1 })).toEqual({ ok: false, error: "not-yours" });
    expect(await confirmBrief(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    expect(await runMatch(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    expect(await myMatch(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    expect(await myCurrentBrief(world.ctx)).toEqual({ ok: true, value: null });
    await signOut(world.ctx);
    expect(await myBrief(world.ctx, id)).toEqual({ ok: false, error: "not-signed-in" });
  });
});

describe("matching a brief against stored experts", () => {
  it("chooses the expert who has the skill and whose price overlaps, and says why the others were not chosen", async () => {
    const world = testWorld();
    await threeExperts(world);
    await buyer(world);
    const id = await confirmedBrief(world);
    const result = await runMatch(world.ctx, id);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.stale).toBe(false);
    const match = result.value.match.result;
    if (match.kind !== "match") throw new Error("expected a match");
    expect(match.expert).toMatchObject({ id: "ruth", name: "Ruth Adeyemi" });
    expect(match.overlap).toEqual({ min: 60, max: 90 });
    expect(match.explanation.join(" ")).toContain("Ruth");
    expect(match.others.map((o) => [o.expert.id, o.reason]).sort()).toEqual([
      ["harold", "competency"],
      ["lin", "price"],
    ]);
    expect(await myMatch(world.ctx, id)).toEqual(result);
  });

  it("renders old stored match explanations in the current language without rewriting the stored result", async () => {
    const world = testWorld();
    await threeExperts(world);
    await buyer(world);
    const id = await confirmedBrief(world);
    const stored = await runMatch(world.ctx, id);
    const brief = await myBrief(world.ctx, id);
    if (!stored.ok || !brief.ok) throw new Error("expected a stored match");

    const localized = localizeStoredMatch(stored.value.match.result, brief.value, "fr");

    if (localized.kind !== "match") throw new Error("expected a match");
    expect(localized.expert.name).toBe("Ruth Adeyemi");
    expect(localized.explanation.join(" ")).toContain("34 ans d’expérience.");
    expect(localized.explanation.join(" ")).toContain("Conditions de fabrication en sous-traitance");
    expect(await myMatch(world.ctx, id)).toEqual(stored);
  });

  it("does not match a brief that is not confirmed", async () => {
    const world = testWorld();
    await threeExperts(world);
    await buyer(world);
    const drafted = await draftBriefFromConversation(world.ctx, ANSWERS);
    expect(await runMatch(world.ctx, drafted.ok ? drafted.value.id : "")).toEqual({ ok: false, error: "not-confirmed" });
  });

  it("considers only experts who are published with a confirmed price, and never names the others", async () => {
    const world = testWorld();
    await seedExpert(world, "draft", "Dee Draft", { tags: ["contract-manufacturing"], state: "draft" });
    await seedExpert(world, "unpriced", "Una Unpriced", { tags: ["contract-manufacturing"], priceConfirmed: false });
    await seedExpert(world, "noprice", "Nora Noprice", { tags: ["contract-manufacturing"], priceRange: null, priceConfirmed: false });
    await buyer(world);
    const result = await runMatch(world.ctx, await confirmedBrief(world));
    if (!result.ok) throw new Error(result.error);
    expect(result.value.match.result.kind).toBe("none");
    expect(JSON.stringify(result.value.match)).not.toMatch(/Dee|Una|Nora/);
  });

  it("says whether the gap is skill or price when nobody fits", async () => {
    const world = testWorld();
    await seedExpert(world, "harold", "Harold Brooks", { tags: ["hospital-operations"] });
    await buyer(world);
    const id = await confirmedBrief(world);
    expect((await runMatch(world.ctx, id).then((r) => (r.ok ? r.value.match.result : null)))).toMatchObject({ kind: "none", reason: "competency" });
    await seedExpert(world, "lin", "Lin Zhao", { tags: ["contract-manufacturing"], priceRange: { min: 120, max: 160 } });
    expect((await runMatch(world.ctx, id).then((r) => (r.ok ? r.value.match.result : null)))).toMatchObject({ kind: "none", reason: "price" });
  });

  it("never matches a person with their own profile", async () => {
    const world = testWorld();
    const sam = await buyer(world);
    await seedExpert(world, sam, "Sam", { tags: ["contract-manufacturing"] });
    await world.ctx.ports.store.put("account", { id: sam, email: "sam@example.com", name: "Sam", roles: ["buyer", "expert"], activeRole: "buyer", createdAt: "2026-11-14T12:00:00.000Z" });
    const result = await runMatch(world.ctx, await confirmedBrief(world));
    expect(result.ok && result.value.match.result.kind).toBe("none");
  });

  it("stores only public fields of the experts it names", async () => {
    const world = testWorld();
    await threeExperts(world);
    await buyer(world);
    const result = await runMatch(world.ctx, await confirmedBrief(world));
    expect(JSON.stringify(result)).not.toContain("@example.com");
  });

  it("marks a stored match stale when the chosen expert unpublishes or reprices out of the budget", async () => {
    const world = testWorld();
    await threeExperts(world);
    await buyer(world);
    const id = await confirmedBrief(world);
    await runMatch(world.ctx, id);
    const ruth = await world.ctx.ports.store.get("profile", "ruth");
    if (ruth === null) throw new Error("no ruth");

    await world.ctx.ports.store.put("profile", { ...ruth, state: "draft" });
    expect(await myMatch(world.ctx, id)).toMatchObject({ ok: true, value: { stale: true } });
    await world.ctx.ports.store.put("profile", { ...ruth, priceRange: { min: 200, max: 300 } });
    expect(await myMatch(world.ctx, id)).toMatchObject({ ok: true, value: { stale: true } });
    await world.ctx.ports.store.put("profile", ruth);
    expect(await myMatch(world.ctx, id)).toMatchObject({ ok: true, value: { stale: false } });
  });

  it("matches against 20 stored experts well within two seconds (SC-003)", async () => {
    const world = testWorld();
    for (let i = 0; i < 20; i += 1) {
      await seedExpert(world, `e${i}`, `Expert ${i}`, { tags: [i % 2 ? "contract-manufacturing" : "hiring"], priceRange: { min: 40 + i * 5, max: 70 + i * 5 }, yearsExperience: 20 + i });
    }
    await buyer(world);
    const id = await confirmedBrief(world);
    const started = performance.now();
    const result = await runMatch(world.ctx, id);
    expect(performance.now() - started).toBeLessThan(2_000);
    expect(result.ok && result.value.match.result.kind).toBe("match");
  });
});
