import { type AdviceCategory, detectRestrictedAdvice } from "../../demo/domain/advice";
import { validateRange } from "../../demo/domain/price";
import type { PriceRange } from "../../demo/domain/types";
import type { Brief } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import type { InterviewAnswer } from "../ports";
import { type AccessError, type Context, actingAccount, owned } from "./context";

/** One of the acting buyer's briefs. Someone else's, or one that does not exist, is `not-yours`. */
export async function myBrief(ctx: Context, id: string): Promise<Result<Brief, AccessError>> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  return owned(await ctx.ports.store.get("brief", id), acting.value, (b) => [b.buyerId]);
}

/** The buyer's most recent brief, or null. */
export async function myCurrentBrief(ctx: Context): Promise<Result<Brief | null, "not-signed-in">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const mine = await ctx.ports.store.list("brief", { buyerId: acting.value.id });
  mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok(mine[0] ?? null);
}

/** Turns the conversation into a saved draft. A problem that names no known skill saves nothing. */
export async function draftBriefFromConversation(ctx: Context, answers: readonly InterviewAnswer[]): Promise<Result<Brief, "not-signed-in" | "unmatched">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const draft = await ctx.ports.agent.draftBrief(answers);
  if (draft.unmatched || draft.skillTag === null) return refuse("unmatched");
  const brief: Brief = { id: ctx.newId(), buyerId: acting.value.id, problem: draft.problem, skillTag: draft.skillTag, units: draft.units, budget: draft.budget, state: "draft", createdAt: ctx.now().toISOString() };
  await ctx.ports.store.put("brief", brief);
  return ok(brief);
}

export interface BriefEdit {
  readonly problem?: string;
  readonly units?: number;
  readonly budget?: PriceRange;
}

/** Any edit makes the brief a draft again and forgets its match: what was matched is no longer what is asked. */
export async function updateBrief(ctx: Context, id: string, edit: BriefEdit): Promise<Result<Brief, AccessError | "invalid-brief">> {
  const found = await myBrief(ctx, id);
  if (!found.ok) return found;
  const problem = (edit.problem ?? found.value.problem).trim();
  const units = edit.units ?? found.value.units;
  const budget = edit.budget ?? found.value.budget;
  if (problem === "" || !Number.isInteger(units) || units < 1 || units > 8 || !validateRange(budget).ok) return refuse("invalid-brief");
  const updated: Brief = { ...found.value, problem, units, budget: { min: budget.min, max: budget.max }, state: "draft" };
  await ctx.ports.store.transaction(async (tx) => {
    await tx.put("brief", updated);
    await tx.remove("match", id);
  });
  return ok(updated);
}

export type ConfirmBriefResult = { readonly ok: true; readonly value: Brief } | { readonly ok: false; readonly error: AccessError } | { readonly ok: false; readonly error: "restricted-advice"; readonly category: AdviceCategory };

/** Explicit: only the buyer's own action confirms a brief (FR-007). Regulated advice is declined (FR-012). */
export async function confirmBrief(ctx: Context, id: string): Promise<ConfirmBriefResult> {
  const found = await myBrief(ctx, id);
  if (!found.ok) return found;
  const category = detectRestrictedAdvice(found.value.problem);
  if (category !== null) return { ok: false, error: "restricted-advice", category };
  const confirmed: Brief = { ...found.value, state: "confirmed" };
  await ctx.ports.store.put("brief", confirmed);
  return ok(confirmed);
}
