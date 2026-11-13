import { matchBrief } from "../../demo/domain/match";
import { overlap } from "../../demo/domain/price";
import type { Expert, Brief as RuleBrief } from "../../demo/domain/types";
import { skillByTag } from "../model/catalogue";
import type { Account, Brief, ExpertProfile, StoredMatch } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import { myBrief } from "./brief";
import type { AccessError, Context } from "./context";

export interface MatchView {
  readonly match: StoredMatch;
  /** True when the chosen expert can no longer be matched with this brief. */
  readonly stale: boolean;
}

/** FR-009: published, with a price the expert confirmed. */
export const isMatchable = (profile: ExpertProfile): boolean => profile.state === "published" && profile.priceConfirmed && profile.priceRange !== null;

/**
 * A stored profile in the shape the walkthrough's matching rule takes. Only public fields cross
 * over: no email address, and no age, which the product does not collect (R13, R19).
 */
function toExpert(profile: ExpertProfile, account: Account): Expert {
  return {
    id: profile.id,
    name: account.name,
    headline: profile.headline,
    yearsExperience: profile.yearsExperience,
    location: profile.location,
    competencies: profile.skills.map((s) => ({ id: s.id, tag: s.tag, label: s.label, description: s.description, source: { kind: "interview", turn: s.source.kind === "interview" ? s.source.turn : 0 } })),
    exampleProblems: profile.exampleProblems,
    priceRange: profile.priceRange,
    published: true,
    credentialsSelfDeclared: true,
  };
}

const toRuleBrief = (brief: Brief): RuleBrief => ({ problem: brief.problem, competencyTag: brief.skillTag, competencyLabel: skillByTag(brief.skillTag)?.label ?? brief.skillTag, units: brief.units, budget: brief.budget, confirmed: true });

async function isStale(ctx: Context, brief: Brief, match: StoredMatch): Promise<boolean> {
  if (match.result.kind !== "match") return false;
  const profile = await ctx.ports.store.get("profile", match.result.expert.id);
  return profile === null || !isMatchable(profile) || profile.priceRange === null || overlap(profile.priceRange, brief.budget) === null || !profile.skills.some((s) => s.tag === brief.skillTag);
}

/**
 * Compares a confirmed brief with every expert who is matchable right now, using the same rule
 * as the walkthrough, and stores the result (FR-009 to FR-011). Experts who are not matchable
 * are left out entirely, so a buyer never learns of an unpublished profile.
 */
export async function runMatch(ctx: Context, briefId: string): Promise<Result<MatchView, AccessError | "not-confirmed">> {
  const found = await myBrief(ctx, briefId);
  if (!found.ok) return found;
  const brief = found.value;
  if (brief.state !== "confirmed") return refuse("not-confirmed");

  const experts: Expert[] = [];
  for (const profile of await ctx.ports.store.list("profile")) {
    if (!isMatchable(profile) || profile.id === brief.buyerId) continue;
    const account = await ctx.ports.store.get("account", profile.id);
    if (account !== null) experts.push(toExpert(profile, account));
  }
  const match: StoredMatch = { id: brief.id, computedAt: ctx.now().toISOString(), result: matchBrief(toRuleBrief(brief), experts) };
  await ctx.ports.store.put("match", match);
  return ok({ match, stale: false });
}

/** The stored match for one of the buyer's briefs, with whether it still holds. */
export async function myMatch(ctx: Context, briefId: string): Promise<Result<MatchView | null, AccessError>> {
  const found = await myBrief(ctx, briefId);
  if (!found.ok) return found;
  const match = await ctx.ports.store.get("match", briefId);
  return ok(match === null ? null : { match, stale: await isStale(ctx, found.value, match) });
}
