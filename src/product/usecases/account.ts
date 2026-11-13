import type { Account, Role } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import type { ConfirmCodeResult, RequestCodeResult } from "../ports";
import { type Context, actingAccount } from "./context";

export function requestSignInCode(ctx: Context, email: string): Promise<RequestCodeResult> {
  return ctx.ports.auth.requestCode(email);
}

type ConfirmError = Extract<ConfirmCodeResult, { ok: false }>["error"];

/** Confirms a code and makes sure the person has an account record. A new account has no role yet. */
export async function signIn(ctx: Context, email: string, code: string): Promise<Result<Account, ConfirmError>> {
  const confirmed = await ctx.ports.auth.confirmCode(email, code);
  if (!confirmed.ok) return refuse(confirmed.error);
  const existing = await ctx.ports.store.get("account", confirmed.accountId);
  if (existing !== null) return ok(existing);
  const account: Account = { id: confirmed.accountId, email: confirmed.email, name: "", roles: [], activeRole: "expert", createdAt: ctx.now().toISOString() };
  await ctx.ports.store.put("account", account);
  return ok(account);
}

export function signOut(ctx: Context): Promise<void> {
  return ctx.ports.auth.signOut();
}

/** Stores what the person asks to be called (R13). */
export async function setName(ctx: Context, name: string): Promise<Result<Account, "not-signed-in" | "empty-name">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const trimmed = name.trim();
  if (trimmed === "") return refuse("empty-name");
  const updated: Account = { ...acting.value, name: trimmed };
  await ctx.ports.store.put("account", updated);
  return ok(updated);
}

/** Explicit: adds a role if the account lacks it and makes it the active one (FR-002). */
export async function chooseRole(ctx: Context, role: Role): Promise<Result<Account, "not-signed-in">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const account = acting.value;
  const updated: Account = { ...account, roles: account.roles.includes(role) ? account.roles : [...account.roles, role], activeRole: role };
  await ctx.ports.store.put("account", updated);
  return ok(updated);
}
