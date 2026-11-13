import type { Payment, Session } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import { type SessionView, sessionView } from "./booking";
import { type AccessError, type Context, actingAccount, owned } from "./context";

async function sessionFor(ctx: Context, id: string, who: (s: Session) => readonly string[]): Promise<Result<{ session: Session; payment: Payment }, AccessError>> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const mine = owned(await ctx.ports.store.get("session", id), acting.value, who);
  if (!mine.ok) return mine;
  const payment = await ctx.ports.store.get("payment", mine.value.proposalId);
  return payment === null ? refuse("not-yours") : ok({ session: mine.value, payment });
}

async function saved(ctx: Context, session: Session, payment: Payment): Promise<Result<SessionView, never>> {
  await ctx.ports.store.transaction(async (tx) => {
    await tx.put("session", session);
    await tx.put("payment", payment);
  });
  const view = await sessionView(ctx, session);
  if (view === null) throw new Error(`session ${session.id} lost its proposal or payment`);
  return ok(view);
}

/**
 * Explicit, by either person, before the session starts. The hold is lifted and the buyer is
 * not charged (FR-018). Afterwards the expert's time is free again.
 */
export async function cancelSession(ctx: Context, id: string): Promise<Result<SessionView, AccessError | "not-confirmed" | "already-started">> {
  const found = await sessionFor(ctx, id, (s) => [s.buyerId, s.expertId]);
  if (!found.ok) return found;
  const { session, payment } = found.value;
  if (session.state !== "confirmed") return refuse("not-confirmed");
  if (ctx.now().getTime() >= new Date(session.startsAt).getTime()) return refuse("already-started");
  const lifted = await ctx.ports.payments.lift(payment.id);
  if (!lifted.ok) return refuse("not-confirmed");
  return saved(ctx, { ...session, state: "cancelled" }, { ...payment, state: "lifted" });
}

/**
 * Explicit, by the expert, once the session has ended. The payment is released, and what the
 * expert is owed after Agely's fee is recorded (FR-018, FR-019). Saying it again changes nothing.
 */
export async function markSessionHeld(ctx: Context, id: string): Promise<Result<SessionView, AccessError | "not-confirmed" | "not-finished">> {
  const found = await sessionFor(ctx, id, (s) => [s.expertId]);
  if (!found.ok) return found;
  const { session, payment } = found.value;
  if (session.state === "held") {
    const view = await sessionView(ctx, session);
    if (view !== null) return ok(view);
  }
  if (session.state !== "confirmed") return refuse("not-confirmed");
  if (ctx.now().getTime() < new Date(session.endsAt).getTime()) return refuse("not-finished");
  const released = await ctx.ports.payments.release(payment.id);
  if (!released.ok) return refuse("not-confirmed");
  return saved(ctx, { ...session, state: "held" }, { ...payment, state: "released" });
}

export interface Earnings {
  /** Sessions the expert marked as held, newest first. */
  readonly released: readonly SessionView[];
  /** What buyers paid for those sessions. */
  readonly paidCents: number;
  readonly feeCents: number;
  /** What the expert is owed. This version records it; payouts are made by hand (FR-019). */
  readonly owedCents: number;
  /** Held for confirmed sessions that have not been marked as held. */
  readonly pendingCents: number;
}

/** The acting person's earnings as an expert. A buyer has none. */
export async function myEarnings(ctx: Context): Promise<Result<Earnings, "not-signed-in">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const released: SessionView[] = [];
  let pendingCents = 0;
  for (const session of await ctx.ports.store.list("session", { expertId: acting.value.id })) {
    const view = await sessionView(ctx, session);
    if (view === null) continue;
    if (view.payment.state === "released") released.push(view);
    else if (view.payment.state === "held") pendingCents += view.payment.amountCents;
  }
  released.sort((a, b) => b.session.startsAt.localeCompare(a.session.startsAt));
  const sum = (pick: (p: Payment) => number): number => released.reduce((n, v) => n + pick(v.payment), 0);
  return ok({ released, paidCents: sum((p) => p.amountCents), feeCents: sum((p) => p.feeCents), owedCents: sum((p) => p.owedCents), pendingCents });
}
