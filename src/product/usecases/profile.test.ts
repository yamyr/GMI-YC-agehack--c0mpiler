import { describe, expect, it } from "vitest";
import { createTranslator } from "../../../site/i18n/core.js";
import type { InterviewAnswer } from "../ports";
import { chooseRole, signOut } from "./account";
import { actingAccount } from "./context";
import { confirmPrice, deleteAccount, draftProfileFromInterview, myProfile, publishProfile, removeSkill, renameSkill, suggestMyPrice, unpublishProfile } from "./profile";
import { type TestWorld, testWorld } from "./testing";

const ANSWERS: readonly InterviewAnswer[] = [
  { questionId: "work", text: "I was a hospital pharmacist for 38 years." },
  { questionId: "responsible", text: "Staff scheduling and negotiating with suppliers." },
  { questionId: "proud", text: "I passed a hard audit after fixing our process." },
  { questionId: "where", text: "Leeds, England" },
];

async function expert(world: TestWorld, email = "ruth@example.com"): Promise<string> {
  const id = await world.signInAs(email);
  await chooseRole(world.ctx, "expert");
  return id;
}

async function drafted(world: TestWorld, email?: string): Promise<string> {
  const id = await expert(world, email);
  const result = await draftProfileFromInterview(world.ctx, "Ruth Adeyemi", ANSWERS);
  if (!result.ok) throw new Error(result.error);
  return id;
}

describe("drafting a profile from the interview", () => {
  it("saves an unpublished draft with the person's name, skills and where each came from", async () => {
    const world = testWorld();
    const id = await expert(world);
    const result = await draftProfileFromInterview(world.ctx, " Ruth Adeyemi ", ANSWERS);
    expect(result).toMatchObject({ ok: true, value: { id, state: "draft", priceRange: null, priceConfirmed: false, selfDeclared: true, yearsExperience: 38, location: "Leeds, England" } });
    if (!result.ok) return;
    expect(result.value.skills.map((s) => s.tag)).toEqual(["hospital-operations", "supplier-negotiation", "staff-scheduling", "supplier-audits"]);
    expect(result.value.skills.map((s) => s.source)).toEqual([
      { kind: "interview", turn: 1 },
      { kind: "interview", turn: 2 },
      { kind: "interview", turn: 2 },
      { kind: "interview", turn: 3 },
    ]);
    expect(new Set(result.value.skills.map((s) => s.id)).size).toBe(4);
    expect(await actingAccount(world.ctx)).toMatchObject({ ok: true, value: { name: "Ruth Adeyemi" } });
    expect(await myProfile(world.ctx)).toEqual(result);
  });

  it("recognizes the stated experience in a localized answer", async () => {
    const world = testWorld();
    await expert(world);
    const work = "J'ai travaillé en négociation avec les fournisseurs pendant 38 ans.";
    const result = await draftProfileFromInterview(world.ctx, "Ruth", [{ questionId: "work", text: work }], "fr");

    expect(result).toMatchObject({ ok: true, value: { headline: work, yearsExperience: 38 } });
  });

  it("retains a typed skill and experience stated before the expert switches languages", async () => {
    const world = testWorld();
    await expert(world);
    const work = "J'ai travaillé en négociation avec les fournisseurs pendant 38 ans.";
    const result = await draftProfileFromInterview(world.ctx, "Ruth", [
      { questionId: "work", text: work, locale: "fr" },
      { questionId: "where", text: "Leeds", locale: "en" },
    ], "en");

    expect(result).toMatchObject({ ok: true, value: { headline: work, yearsExperience: 38, skills: [{ tag: "supplier-negotiation" }] } });
  });

  it("translates a selected reply and preserves the same text when the expert types it", async () => {
    const world = testWorld();
    await expert(world);
    const text = "I ran procurement for a manufacturer for 34 years.";
    const selected = await draftProfileFromInterview(world.ctx, "Ruth", [{ questionId: "work", text, suggested: true }], "fr");
    const typed = await draftProfileFromInterview(world.ctx, "Ruth", [{ questionId: "work", text }], "fr");

    const translation = createTranslator("fr")(text);
    expect(translation).not.toBe(text);
    expect(selected).toMatchObject({ ok: true, value: { headline: translation, yearsExperience: 34 } });
    expect(typed).toMatchObject({ ok: true, value: { headline: text, yearsExperience: 34 } });
  });

  it("saves nothing and says so when the answers name no skill", async () => {
    const world = testWorld();
    await expert(world);
    expect(await draftProfileFromInterview(world.ctx, "Ruth", [{ questionId: "work", text: "I like gardening." }])).toEqual({ ok: false, error: "unmatched" });
    expect(await myProfile(world.ctx)).toEqual({ ok: true, value: null });
  });

  it("needs a name and a signed-in person", async () => {
    const world = testWorld();
    expect(await draftProfileFromInterview(world.ctx, "Ruth", ANSWERS)).toEqual({ ok: false, error: "not-signed-in" });
    await expert(world);
    expect(await draftProfileFromInterview(world.ctx, "  ", ANSWERS)).toEqual({ ok: false, error: "empty-name" });
  });

  it("never publishes, and a second interview keeps a published state and a confirmed price", async () => {
    const world = testWorld();
    await drafted(world);
    await confirmPrice(world.ctx, { min: 60, max: 90 });
    await publishProfile(world.ctx);
    const again = await draftProfileFromInterview(world.ctx, "Ruth Adeyemi", ANSWERS);
    expect(again).toMatchObject({ ok: true, value: { state: "published", priceConfirmed: true, priceRange: { min: 60, max: 90 } } });
  });
});

describe("editing skills", () => {
  it("renames a skill and marks it as edited", async () => {
    const world = testWorld();
    await drafted(world);
    const before = await myProfile(world.ctx);
    if (!before.ok || before.value === null) throw new Error("no profile");
    const target = before.value.skills[1];
    if (target === undefined) throw new Error("no skill");
    const result = await renameSkill(world.ctx, target.id, "  Negotiating medicine contracts ");
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.value.skills[1]).toMatchObject({ label: "Negotiating medicine contracts", tag: target.tag, source: { kind: "edited" } });
  });

  it("refuses an empty label and a skill that is not on the profile", async () => {
    const world = testWorld();
    await drafted(world);
    const profile = await myProfile(world.ctx);
    const id = profile.ok && profile.value ? (profile.value.skills[0]?.id ?? "") : "";
    expect(await renameSkill(world.ctx, id, "   ")).toEqual({ ok: false, error: "empty-label" });
    expect(await renameSkill(world.ctx, "no-such-skill", "x")).toEqual({ ok: false, error: "no-such-skill" });
    expect(await removeSkill(world.ctx, "no-such-skill")).toEqual({ ok: false, error: "no-such-skill" });
  });

  it("removes a skill, but not the last one", async () => {
    const world = testWorld();
    await drafted(world);
    let profile = await myProfile(world.ctx);
    if (!profile.ok || profile.value === null) throw new Error("no profile");
    const ids = profile.value.skills.map((s) => s.id);
    for (const id of ids.slice(0, -1)) expect((await removeSkill(world.ctx, id)).ok).toBe(true);
    expect(await removeSkill(world.ctx, ids[ids.length - 1] ?? "")).toEqual({ ok: false, error: "last-skill" });
    profile = await myProfile(world.ctx);
    expect(profile.ok && profile.value?.skills.length).toBe(1);
  });
});

describe("publishing and pricing are the expert's own acts", () => {
  it("publishes and unpublishes without losing anything", async () => {
    const world = testWorld();
    await drafted(world);
    expect(await publishProfile(world.ctx)).toMatchObject({ ok: true, value: { state: "published" } });
    const published = await myProfile(world.ctx);
    expect(await unpublishProfile(world.ctx)).toMatchObject({ ok: true, value: { state: "draft" } });
    const unpublished = await myProfile(world.ctx);
    if (!published.ok || !unpublished.ok || !published.value || !unpublished.value) throw new Error("no profile");
    expect({ ...unpublished.value, state: "published" }).toEqual(published.value);
  });

  it("cannot publish or price a profile that does not exist", async () => {
    const world = testWorld();
    await expert(world);
    expect(await publishProfile(world.ctx)).toEqual({ ok: false, error: "no-profile" });
    expect(await unpublishProfile(world.ctx)).toEqual({ ok: false, error: "no-profile" });
    expect(await confirmPrice(world.ctx, { min: 60, max: 90 })).toEqual({ ok: false, error: "no-profile" });
    expect(await suggestMyPrice(world.ctx)).toEqual({ ok: false, error: "no-profile" });
  });

  it("confirms a valid price range and refuses an invalid one, leaving the old one in place", async () => {
    const world = testWorld();
    await drafted(world);
    expect(await confirmPrice(world.ctx, { min: 60, max: 90 })).toMatchObject({ ok: true, value: { priceRange: { min: 60, max: 90 }, priceConfirmed: true } });
    for (const bad of [{ min: 90, max: 60 }, { min: 0, max: 50 }, { min: 60.5, max: 90 }]) {
      expect(await confirmPrice(world.ctx, bad)).toEqual({ ok: false, error: "invalid-range" });
    }
    expect(await myProfile(world.ctx)).toMatchObject({ ok: true, value: { priceRange: { min: 60, max: 90 }, priceConfirmed: true } });
  });

  it("suggests a price with reasons and does not confirm it", async () => {
    const world = testWorld();
    await drafted(world);
    const suggestion = await suggestMyPrice(world.ctx);
    expect(suggestion.ok && suggestion.value.reasons.length).toBeGreaterThanOrEqual(2);
    expect(await myProfile(world.ctx)).toMatchObject({ ok: true, value: { priceRange: null, priceConfirmed: false } });
  });

  it("keeps each person's profile to themselves", async () => {
    const world = testWorld();
    const ruth = await drafted(world, "ruth@example.com");
    await publishProfile(world.ctx);
    await signOut(world.ctx);

    await expert(world, "walter@example.com");
    expect(await myProfile(world.ctx)).toEqual({ ok: true, value: null });
    expect(await publishProfile(world.ctx)).toEqual({ ok: false, error: "no-profile" });
    expect(await unpublishProfile(world.ctx)).toEqual({ ok: false, error: "no-profile" });
    // Ruth's profile is untouched by anything Walter did.
    expect(await world.ctx.ports.store.get("profile", ruth)).toMatchObject({ state: "published" });
  });

  it("refuses everything when nobody is signed in", async () => {
    const world = testWorld();
    await drafted(world);
    await signOut(world.ctx);
    for (const attempt of [myProfile(world.ctx), publishProfile(world.ctx), unpublishProfile(world.ctx), confirmPrice(world.ctx, { min: 1, max: 2 }), suggestMyPrice(world.ctx), renameSkill(world.ctx, "x", "y"), removeSkill(world.ctx, "x"), deleteAccount(world.ctx)]) {
      expect(await attempt).toEqual({ ok: false, error: "not-signed-in" });
    }
  });
});

describe("deleting an account", () => {
  it("removes the account and its profile, signs out, and the email starts afresh", async () => {
    const world = testWorld();
    const first = await drafted(world);
    await publishProfile(world.ctx);
    expect(await deleteAccount(world.ctx)).toEqual({ ok: true, value: null });
    expect(await world.ctx.ports.store.get("account", first)).toBeNull();
    expect(await world.ctx.ports.store.get("profile", first)).toBeNull();
    expect(await world.ctx.ports.auth.current()).toBeNull();
    const second = await world.signInAs("ruth@example.com");
    expect(second).not.toBe(first);
    expect(await actingAccount(world.ctx)).toMatchObject({ ok: true, value: { roles: [], name: "" } });
  });

  it("leaves other people's data alone", async () => {
    const world = testWorld();
    const ruth = await drafted(world, "ruth@example.com");
    await signOut(world.ctx);
    await drafted(world, "walter@example.com");
    await deleteAccount(world.ctx);
    expect(await world.ctx.ports.store.get("profile", ruth)).not.toBeNull();
    expect((await world.ctx.ports.store.list("account")).map((a) => a.id)).toEqual([ruth]);
  });

  it("is refused while a confirmed session has not finished", async () => {
    const world = testWorld();
    const ruth = await drafted(world);
    const startsAt = new Date(world.ctx.now().getTime() + 3_600_000).toISOString();
    const endsAt = new Date(world.ctx.now().getTime() + 5_400_000).toISOString();
    await world.ctx.ports.store.put("session", { id: "s1", proposalId: "p1", buyerId: "someone", expertId: ruth, startsAt, endsAt, totalCents: 15_000, meeting: { url: "https://meet.agely.example/s1", provider: "Stand-in meeting", standIn: true }, state: "confirmed" });
    expect(await deleteAccount(world.ctx)).toEqual({ ok: false, error: "session-not-finished" });
    world.advance(120);
    expect(await deleteAccount(world.ctx)).toEqual({ ok: true, value: null });
  });
});
