import type { Ports } from "../ports";
import { makeStandInAgent } from "../standins/agent";
import { AUTH_KEY, makeStandInAuth } from "../standins/auth";
import { type KeyValue, memory } from "../standins/kv";
import { makeStandInMeetings } from "../standins/meetings";
import { type StandInPayments, makeStandInPayments } from "../standins/payments";
import { makeStandInStore } from "../standins/store";
import { signIn } from "./account";
import type { Context } from "./context";

export interface TestWorld {
  readonly ctx: Context;
  readonly payments: StandInPayments;
  /** The storage under every stand-in, for tests that need to see what was really written. */
  readonly kv: KeyValue;
  /** Move the clock. */
  advance(minutes: number): void;
  /** Sign in as this email, creating the account the first time. Returns the account id. */
  signInAs(email: string): Promise<string>;
}

/** A complete set of stand-ins over fresh in-memory storage, with a clock tests control. */
export function testWorld(start = "2026-11-14T12:00:00.000Z"): TestWorld {
  const kv = memory();
  let time = new Date(start).getTime();
  let counter = 0;
  const now = (): Date => new Date(time);
  const newId = (): string => `id-${++counter}`;
  const payments = makeStandInPayments(kv);
  const ports: Ports = {
    auth: makeStandInAuth({ kv, now, newCode: () => String(100_000 + ++counter), newId }),
    store: makeStandInStore(kv),
    agent: makeStandInAgent(),
    payments,
    meetings: makeStandInMeetings(),
  };
  const ctx: Context = { ports, now, newId };
  return {
    ctx,
    payments,
    kv,
    advance: (minutes) => void (time += minutes * 60_000),
    async signInAs(email) {
      const requested = await ports.auth.requestCode(email);
      if (!requested.ok) throw new Error(requested.error);
      const code = (JSON.parse(kv.getItem(AUTH_KEY) ?? "{}") as { codes: Record<string, { code: string }> }).codes[email.trim().toLowerCase()]?.code ?? "";
      const result = await signIn(ctx, email, code);
      if (!result.ok) throw new Error(result.error);
      return result.value.id;
    },
  };
}
