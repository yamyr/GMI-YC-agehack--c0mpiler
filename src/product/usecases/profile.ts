import type { Locale } from "../../../site/i18n/core.js";
import { validateRange } from "../../demo/domain/price";
import type { PriceRange } from "../../demo/domain/types";
import { displaySkillDescription, displaySkillLabel } from "../model/catalogue";
import type { ExpertProfile, Skill } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import type { InterviewAnswer, PriceSuggestion } from "../ports";
import { setName } from "./account";
import { type Context, actingAccount } from "./context";

type NotSignedIn = "not-signed-in";

/** The acting person's own profile. A profile's id is its owner's account id, so nobody can ask for another's (FR-004). */
export async function myProfile(ctx: Context): Promise<Result<ExpertProfile | null, NotSignedIn>> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  return ok(await ctx.ports.store.get("profile", acting.value.id));
}

async function existing(ctx: Context): Promise<Result<ExpertProfile, NotSignedIn | "no-profile">> {
  const mine = await myProfile(ctx);
  if (!mine.ok) return mine;
  return mine.value === null ? refuse("no-profile") : ok(mine.value);
}

async function change(ctx: Context, edit: (profile: ExpertProfile) => ExpertProfile): Promise<Result<ExpertProfile, NotSignedIn | "no-profile">> {
  const found = await existing(ctx);
  if (!found.ok) return found;
  const updated = edit(found.value);
  await ctx.ports.store.put("profile", updated);
  return ok(updated);
}

/**
 * Turns interview answers into a saved draft. It never publishes and never confirms a price: a
 * profile that was already published or priced keeps that state, and a new one starts as a
 * draft (FR-006). When the answers name no skill, nothing is saved.
 */
export async function draftProfileFromInterview(ctx: Context, name: string, answers: readonly InterviewAnswer[], locale: Locale = "en"): Promise<Result<ExpertProfile, NotSignedIn | "empty-name" | "unmatched">> {
  const named = await setName(ctx, name);
  if (!named.ok) return named;
  const draft = await ctx.ports.agent.draftProfile(answers, locale);
  if (draft.unmatched) return refuse("unmatched");
  const before = await ctx.ports.store.get("profile", named.value.id);
  const profile: ExpertProfile = {
    id: named.value.id,
    headline: draft.headline,
    location: draft.location,
    yearsExperience: draft.yearsExperience,
    skills: draft.skills.map((s): Skill => ({ id: ctx.newId(), tag: s.tag, label: s.label, description: s.description, source: { kind: "interview", turn: s.sourceTurn } })),
    exampleProblems: [],
    priceRange: before?.priceRange ?? null,
    priceConfirmed: before?.priceConfirmed ?? false,
    state: before?.state ?? "draft",
    selfDeclared: true,
  };
  await ctx.ports.store.put("profile", profile);
  return ok(profile);
}

export async function renameSkill(ctx: Context, skillId: string, label: string): Promise<Result<ExpertProfile, NotSignedIn | "no-profile" | "no-such-skill" | "empty-label">> {
  const found = await existing(ctx);
  if (!found.ok) return found;
  if (!found.value.skills.some((s) => s.id === skillId)) return refuse("no-such-skill");
  const trimmed = label.trim();
  if (trimmed === "") return refuse("empty-label");
  return change(ctx, (p) => ({ ...p, skills: p.skills.map((s) => (s.id === skillId ? { ...s, label: trimmed, source: { kind: "edited" } } : s)) }));
}

export async function removeSkill(ctx: Context, skillId: string): Promise<Result<ExpertProfile, NotSignedIn | "no-profile" | "no-such-skill" | "last-skill">> {
  const found = await existing(ctx);
  if (!found.ok) return found;
  if (!found.value.skills.some((s) => s.id === skillId)) return refuse("no-such-skill");
  if (found.value.skills.length === 1) return refuse("last-skill");
  return change(ctx, (p) => ({ ...p, skills: p.skills.filter((s) => s.id !== skillId) }));
}

/** Explicit: only the expert's own action reaches this (FR-006). */
export function publishProfile(ctx: Context): Promise<Result<ExpertProfile, NotSignedIn | "no-profile">> {
  return change(ctx, (p) => ({ ...p, state: "published" }));
}

/** Explicit. Nothing but the state changes, so publishing again restores exactly what was there. */
export function unpublishProfile(ctx: Context): Promise<Result<ExpertProfile, NotSignedIn | "no-profile">> {
  return change(ctx, (p) => ({ ...p, state: "draft" }));
}

/** The agent's suggestion. It is shown, never applied. */
export async function suggestMyPrice(ctx: Context, locale: Locale = "en"): Promise<Result<PriceSuggestion, NotSignedIn | "no-profile">> {
  const found = await existing(ctx);
  if (!found.ok) return found;
  const p = found.value;
  return ok(await ctx.ports.agent.suggestPrice({
    headline: p.headline,
    location: p.location,
    yearsExperience: p.yearsExperience,
    unmatched: false,
    skills: p.skills.map((skill) => ({
      tag: skill.tag,
      label: displaySkillLabel(skill, locale),
      description: displaySkillDescription(skill, locale),
      sourceTurn: skill.source.kind === "interview" ? skill.source.turn : 0,
    })),
  }, locale));
}

/** Explicit: the expert names their own price (FR-006). */
export async function confirmPrice(ctx: Context, range: PriceRange): Promise<Result<ExpertProfile, NotSignedIn | "no-profile" | "invalid-range">> {
  const found = await existing(ctx);
  if (!found.ok) return found;
  if (!validateRange(range).ok) return refuse("invalid-range");
  return change(ctx, (p) => ({ ...p, priceRange: { min: range.min, max: range.max }, priceConfirmed: true }));
}

/**
 * Explicit. Removes the account, its profile, its briefs and their matches, and proposals it
 * sent that are still waiting, then makes the sign-in service forget it (FR-003, R17).
 */
export async function deleteAccount(ctx: Context): Promise<Result<null, NotSignedIn | "session-not-finished">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const { id } = acting.value;
  const { store } = ctx.ports;
  const sessions = [...(await store.list("session", { buyerId: id })), ...(await store.list("session", { expertId: id }))];
  if (sessions.some((s) => s.state === "confirmed" && new Date(s.endsAt).getTime() > ctx.now().getTime())) return refuse("session-not-finished");

  await store.transaction(async (tx) => {
    for (const brief of await tx.list("brief", { buyerId: id })) {
      await tx.remove("match", brief.id);
      await tx.remove("brief", brief.id);
    }
    for (const proposal of await tx.list("proposal", { buyerId: id, state: "waiting" })) await tx.remove("proposal", proposal.id);
    await tx.remove("profile", id);
    await tx.remove("account", id);
  });
  await ctx.ports.auth.forget(id);
  return ok(null);
}
