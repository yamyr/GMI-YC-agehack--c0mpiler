import { contains, overlap } from "../../demo/domain/price";
import type { PriceRange } from "../../demo/domain/types";
import { feeCents, owedCents, sessionTotalCents } from "../model/money";
import type { Account, Payment, Proposal, Session } from "../model/types";
import { type Result, ok, refuse } from "../model/types";
import { setName } from "./account";
import { myBrief } from "./brief";
import { type AccessError, type Context, actingAccount, owned } from "./context";
import { isMatchable, myMatch } from "./match";

export interface ProposalInput {
  readonly units: number;
  /** Whole dollars per 15 minutes. */
  readonly pricePerUnit: number;
  readonly startsAt: string;
  /** What the expert will see the buyer called (R13). */
  readonly buyerName: string;
}

export interface ProposalView {
  readonly proposal: Proposal;
  readonly buyerName: string;
  readonly expertName: string;
  readonly problem: string;
  readonly totalCents: number;
  /** The session, once the proposal has been accepted. */
  readonly sessionId: string | null;
}

export interface SessionView {
  readonly session: Session;
  readonly payment: Payment;
  readonly buyerName: string;
  readonly expertName: string;
  readonly problem: string;
  readonly units: number;
  readonly pricePerUnit: number;
  /** Where the session stands now. "awaiting" is a confirmed session whose end has passed. */
  readonly phase: "upcoming" | "awaiting" | "held" | "cancelled";
}

const endOf = (proposal: Pick<Proposal, "startsAt" | "units">): number => new Date(proposal.startsAt).getTime() + proposal.units * 15 * 60_000;
const overlaps = (a: Pick<Proposal, "startsAt" | "units">, b: Pick<Proposal, "startsAt" | "units">): boolean => new Date(a.startsAt).getTime() < endOf(b) && new Date(b.startsAt).getTime() < endOf(a);

/** The price range the two share right now, or null when they no longer meet. */
async function sharedRange(ctx: Context, expertId: string, budget: PriceRange): Promise<PriceRange | null> {
  const profile = await ctx.ports.store.get("profile", expertId);
  return profile === null || !isMatchable(profile) || profile.priceRange === null ? null : overlap(profile.priceRange, budget);
}

type SendError = AccessError | "empty-name" | "no-match" | "stale-match" | "already-proposed" | "invalid-length" | "price-outside-range" | "time-in-past";

/** Explicit: the buyer proposes; nothing is booked, charged or held (FR-013, FR-014). */
export async function sendProposal(ctx: Context, briefId: string, input: ProposalInput): Promise<Result<Proposal, SendError>> {
  const found = await myBrief(ctx, briefId);
  if (!found.ok) return found;
  const brief = found.value;
  const view = await myMatch(ctx, briefId);
  if (!view.ok) return view;
  if (view.value === null || view.value.match.result.kind !== "match") return refuse("no-match");
  if (view.value.stale) return refuse("stale-match");
  const expertId = view.value.match.result.expert.id;

  if (input.buyerName.trim() === "") return refuse("empty-name");
  if (!Number.isInteger(input.units) || input.units < 1 || input.units > 8) return refuse("invalid-length");
  const shared = await sharedRange(ctx, expertId, brief.budget);
  if (shared === null) return refuse("stale-match");
  if (!Number.isInteger(input.pricePerUnit) || !contains(shared, input.pricePerUnit)) return refuse("price-outside-range");
  const starts = new Date(input.startsAt).getTime();
  if (Number.isNaN(starts) || starts <= ctx.now().getTime()) return refuse("time-in-past");
  const open = await ctx.ports.store.list("proposal", { briefId });
  if (open.some((p) => p.state === "waiting" || p.state === "accepted")) return refuse("already-proposed");

  await setName(ctx, input.buyerName);
  const proposal: Proposal = { id: ctx.newId(), briefId, buyerId: brief.buyerId, expertId, units: input.units, pricePerUnit: input.pricePerUnit, startsAt: new Date(starts).toISOString(), state: "waiting" };
  await ctx.ports.store.put("proposal", proposal);
  return ok(proposal);
}

async function proposalFor(ctx: Context, id: string, who: (p: Proposal) => readonly string[]): Promise<Result<{ proposal: Proposal; account: Account }, AccessError>> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const mine = owned(await ctx.ports.store.get("proposal", id), acting.value, who);
  return mine.ok ? ok({ proposal: mine.value, account: acting.value }) : mine;
}

async function settle(ctx: Context, id: string, who: (p: Proposal) => readonly string[], to: "withdrawn" | "declined"): Promise<Result<Proposal, AccessError | "not-waiting">> {
  const found = await proposalFor(ctx, id, who);
  if (!found.ok) return found;
  if (found.value.proposal.state !== "waiting") return refuse("not-waiting");
  const updated: Proposal = { ...found.value.proposal, state: to };
  await ctx.ports.store.put("proposal", updated);
  return ok(updated);
}

/** Explicit, by the buyer. */
export const withdrawProposal = (ctx: Context, id: string): Promise<Result<Proposal, AccessError | "not-waiting">> => settle(ctx, id, (p) => [p.buyerId], "withdrawn");

/** Explicit, by the expert the proposal was sent to. Nothing is held (FR-014). */
export const declineProposal = (ctx: Context, id: string): Promise<Result<Proposal, AccessError | "not-waiting">> => settle(ctx, id, (p) => [p.expertId], "declined");

type AcceptError = AccessError | "not-waiting" | "price-outside-range" | "time-in-past" | "time-taken" | "payment-failed";

/**
 * Explicit, by the expert the proposal was sent to. Holds the buyer's payment first, keyed by
 * the proposal so it can only ever be held once (FR-016), and confirms the session only if the
 * hold succeeded (FR-015). Submitting it again, or after an interruption, returns the same
 * session.
 */
export async function acceptProposal(ctx: Context, id: string): Promise<Result<{ session: Session; payment: Payment }, AcceptError>> {
  const found = await proposalFor(ctx, id, (p) => [p.expertId]);
  if (!found.ok) return found;
  const { proposal } = found.value;
  const { store } = ctx.ports;

  if (proposal.state === "accepted") {
    const [session] = await store.list("session", { proposalId: id });
    const payment = await store.get("payment", id);
    if (session !== undefined && payment !== null) return ok({ session, payment });
  } else if (proposal.state !== "waiting") {
    return refuse("not-waiting");
  }

  const brief = await store.get("brief", proposal.briefId);
  const shared = brief === null ? null : await sharedRange(ctx, proposal.expertId, brief.budget);
  if (shared === null || !contains(shared, proposal.pricePerUnit)) return refuse("price-outside-range");
  if (new Date(proposal.startsAt).getTime() <= ctx.now().getTime()) return refuse("time-in-past");
  const booked = await store.list("session", { expertId: proposal.expertId, state: "confirmed" });
  if (booked.some((s) => new Date(s.startsAt).getTime() < endOf(proposal) && new Date(proposal.startsAt).getTime() < new Date(s.endsAt).getTime())) return refuse("time-taken");

  const totalCents = sessionTotalCents(proposal.units, proposal.pricePerUnit);
  const held = await ctx.ports.payments.hold(id, totalCents);
  if (!held.ok) return refuse("payment-failed");

  const sessionId = ctx.newId();
  const endsAt = new Date(endOf(proposal)).toISOString();
  const session: Session = { id: sessionId, proposalId: id, buyerId: proposal.buyerId, expertId: proposal.expertId, startsAt: proposal.startsAt, endsAt, totalCents, meeting: await ctx.ports.meetings.createLink(sessionId, proposal.startsAt, endsAt), state: "confirmed" };
  const payment: Payment = { id, sessionId, amountCents: totalCents, feeCents: feeCents(totalCents), owedCents: owedCents(totalCents), state: "held", standIn: held.payment.standIn };

  await store.transaction(async (tx) => {
    await tx.put("proposal", { ...proposal, state: "accepted" });
    await tx.put("session", session);
    await tx.put("payment", payment);
    // The other buyers who asked for an overlapping time are told it has gone.
    for (const other of await tx.list("proposal", { expertId: proposal.expertId, state: "waiting" })) {
      if (other.id !== id && overlaps(other, proposal)) await tx.put("proposal", { ...other, state: "unavailable" });
    }
  });
  return ok({ session, payment });
}

async function nameOf(ctx: Context, accountId: string): Promise<string> {
  const account = await ctx.ports.store.get("account", accountId);
  return account === null ? "Deleted account" : account.name;
}

/** Proposals the acting person sent or received, newest session time first. Email addresses never leave. */
export async function myProposals(ctx: Context): Promise<Result<ProposalView[], "not-signed-in">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const { store } = ctx.ports;
  const all = [...(await store.list("proposal", { buyerId: acting.value.id })), ...(await store.list("proposal", { expertId: acting.value.id }))];
  const views: ProposalView[] = [];
  for (const proposal of all) {
    const brief = await store.get("brief", proposal.briefId);
    const [session] = proposal.state === "accepted" ? await store.list("session", { proposalId: proposal.id }) : [];
    views.push({ proposal, buyerName: await nameOf(ctx, proposal.buyerId), expertName: await nameOf(ctx, proposal.expertId), problem: brief?.problem ?? "", totalCents: sessionTotalCents(proposal.units, proposal.pricePerUnit), sessionId: session?.id ?? null });
  }
  return ok(views.sort((a, b) => b.proposal.startsAt.localeCompare(a.proposal.startsAt)));
}

export async function sessionView(ctx: Context, session: Session): Promise<SessionView | null> {
  const { store } = ctx.ports;
  const payment = await store.get("payment", session.proposalId);
  const proposal = await store.get("proposal", session.proposalId);
  if (payment === null || proposal === null) return null;
  const brief = await store.get("brief", proposal.briefId);
  const phase = session.state === "held" ? "held" : session.state === "cancelled" ? "cancelled" : ctx.now().getTime() >= new Date(session.endsAt).getTime() ? "awaiting" : "upcoming";
  return { session, payment, buyerName: await nameOf(ctx, session.buyerId), expertName: await nameOf(ctx, session.expertId), problem: brief?.problem ?? "", units: proposal.units, pricePerUnit: proposal.pricePerUnit, phase };
}

/** One session, for its buyer or its expert only (FR-004). */
export async function mySession(ctx: Context, id: string): Promise<Result<SessionView, AccessError>> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const mine = owned(await ctx.ports.store.get("session", id), acting.value, (s) => [s.buyerId, s.expertId]);
  if (!mine.ok) return mine;
  const view = await sessionView(ctx, mine.value);
  return view === null ? refuse("not-yours") : ok(view);
}

export async function mySessions(ctx: Context): Promise<Result<SessionView[], "not-signed-in">> {
  const acting = await actingAccount(ctx);
  if (!acting.ok) return acting;
  const { store } = ctx.ports;
  const sessions = [...(await store.list("session", { buyerId: acting.value.id })), ...(await store.list("session", { expertId: acting.value.id }))];
  const views: SessionView[] = [];
  for (const session of sessions) {
    const view = await sessionView(ctx, session);
    if (view !== null) views.push(view);
  }
  return ok(views.sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt)));
}
