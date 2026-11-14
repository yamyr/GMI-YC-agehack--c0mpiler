import type { Account } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import type { Ports } from "../ports";
import type { TryOutClock } from "../standins/clock";

/** Everything a use case needs from outside: the services and the time (research R7, R11). */
export interface Context {
  readonly ports: Ports;
  readonly now: () => Date;
  readonly newId: () => string;
  /** The try-out clock behind `now`, when the product runs on stand-ins (R11). */
  readonly clock?: TryOutClock;
}

export type AccessError = "not-signed-in" | "not-yours";

/** The signed-in account, or a refusal. Every use case that acts for a person starts here. */
export async function actingAccount(ctx: Context): Promise<Result<Account, "not-signed-in">> {
  const id = await ctx.ports.auth.current();
  if (id === null) return refuse("not-signed-in");
  const account = await ctx.ports.store.get("account", id);
  return account === null ? refuse("not-signed-in") : ok(account);
}

/**
 * Checks that the acting account is one of the owners of a thing. A thing that does not exist
 * and a thing that belongs to someone else get the same answer, so nothing leaks (FR-004).
 */
export function owned<T>(thing: T | null, account: Account, owners: (thing: T) => readonly string[]): Result<T, "not-yours"> {
  return thing !== null && owners(thing).includes(account.id) ? ok(thing) : refuse("not-yours");
}
