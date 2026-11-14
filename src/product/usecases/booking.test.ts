import { describe, expect, it } from "vitest";
import { PAYMENTS_KEY } from "../standins/payments";
import { chooseRole, signOut } from "./account";
import { acceptProposal, declineProposal, myProposals, mySession, mySessions, sendProposal, withdrawProposal } from "./booking";
import { confirmBrief, draftBriefFromConversation } from "./brief";
import { runMatch } from "./match";
import { type TestWorld, testWorld } from "./testing";

const HOUR = 60;
const at = (world: TestWorld, minutesFromNow: number): string => new Date(world.ctx.now().getTime() + minutesFromNow * 60_000).toISOString();

/** Ruth: a real, signed-up expert with a published profile at $60–$90. Leaves nobody signed in. */
async function ruth(world: TestWorld, email = "ruth@example.com"): Promise<string> {
  const id = await world.signInAs(email);
  await chooseRole(world.ctx, "expert");
  await world.ctx.ports.store.put("account", { id, email, name: "Ruth Adeyemi", roles: ["expert"], activeRole: "expert", createdAt: world.ctx.now().toISOString() });
  await world.ctx.ports.store.put("profile", { id, headline: "h", location: "", yearsExperience: 34, skills: [{ id: "s1", tag: "contract-manufacturing", label: "Contract manufacturing terms", description: "", source: { kind: "interview", turn: 1 } }], exampleProblems: [], priceRange: { min: 60, max: 90 }, priceConfirmed: true, state: "published", selfDeclared: true });
  await signOut(world.ctx);
  return id;
}

/** Sam: a buyer with a confirmed brief ($50–$100, 30 minutes) matched with Ruth. Leaves Sam signed in. */
async function samMatched(world: TestWorld, email = "sam@example.com"): Promise<string> {
  await world.signInAs(email);
  await chooseRole(world.ctx, "buyer");
  const drafted = await draftBriefFromConversation(world.ctx, [
    { questionId: "problem", text: "I'm about to sign with a contract manufacturer." },
    { questionId: "length", text: "30 minutes" },
    { questionId: "budget", text: "$50 to $100" },
  ]);
  if (!drafted.ok) throw new Error(drafted.error);
  await confirmBrief(world.ctx, drafted.value.id);
  await runMatch(world.ctx, drafted.value.id);
  return drafted.value.id;
}

async function proposed(world: TestWorld, start = 24 * HOUR): Promise<{ ruthId: string; briefId: string; proposalId: string }> {
  const ruthId = await ruth(world);
  const briefId = await samMatched(world);
  const sent = await sendProposal(world.ctx, briefId, { units: 2, pricePerUnit: 75, startsAt: at(world, start), buyerName: "Sam Ortiz" });
  if (!sent.ok) throw new Error(sent.error);
  return { ruthId, briefId, proposalId: sent.value.id };
}

const asRuth = async (world: TestWorld): Promise<void> => {
  await signOut(world.ctx);
  await world.signInAs("ruth@example.com");
};
const asSam = async (world: TestWorld): Promise<void> => {
  await signOut(world.ctx);
  await world.signInAs("sam@example.com");
};
const heldPayments = (world: TestWorld): number => Object.keys(JSON.parse((world.kv.getItem(PAYMENTS_KEY) ?? "{}") as string) as object).length;

describe("proposing a session", () => {
  it("creates a waiting proposal and books or charges nothing", async () => {
    const world = testWorld();
    const { ruthId, briefId, proposalId } = await proposed(world);
    expect(await world.ctx.ports.store.get("proposal", proposalId)).toMatchObject({ briefId, expertId: ruthId, units: 2, pricePerUnit: 75, state: "waiting" });
    expect(await world.ctx.ports.store.list("session")).toEqual([]);
    expect(heldPayments(world)).toBe(0);
    expect((await world.ctx.ports.store.list("account")).find((a) => a.email === "sam@example.com")?.name).toBe("Sam Ortiz");
  });

  it("refuses a price outside the shared range, a bad length, a past time and a missing name", async () => {
    const world = testWorld();
    await ruth(world);
    const briefId = await samMatched(world);
    const good = { units: 2, pricePerUnit: 75, startsAt: at(world, 24 * HOUR), buyerName: "Sam" };
    expect(await sendProposal(world.ctx, briefId, { ...good, pricePerUnit: 95 })).toEqual({ ok: false, error: "price-outside-range" });
    expect(await sendProposal(world.ctx, briefId, { ...good, pricePerUnit: 59 })).toEqual({ ok: false, error: "price-outside-range" });
    expect(await sendProposal(world.ctx, briefId, { ...good, pricePerUnit: 75.5 })).toEqual({ ok: false, error: "price-outside-range" });
    expect(await sendProposal(world.ctx, briefId, { ...good, units: 0 })).toEqual({ ok: false, error: "invalid-length" });
    expect(await sendProposal(world.ctx, briefId, { ...good, units: 9 })).toEqual({ ok: false, error: "invalid-length" });
    expect(await sendProposal(world.ctx, briefId, { ...good, startsAt: at(world, -5) })).toEqual({ ok: false, error: "time-in-past" });
    expect(await sendProposal(world.ctx, briefId, { ...good, startsAt: "not a date" })).toEqual({ ok: false, error: "time-in-past" });
    expect(await sendProposal(world.ctx, briefId, { ...good, buyerName: "  " })).toEqual({ ok: false, error: "empty-name" });
    expect(await world.ctx.ports.store.list("proposal")).toEqual([]);
  });

  it("needs a match that still holds", async () => {
    const world = testWorld();
    const ruthId = await ruth(world);
    const briefId = await samMatched(world);
    const good = { units: 2, pricePerUnit: 75, startsAt: at(world, 24 * HOUR), buyerName: "Sam" };
    const profile = await world.ctx.ports.store.get("profile", ruthId);
    if (profile === null) throw new Error("no profile");
    await world.ctx.ports.store.put("profile", { ...profile, state: "draft" });
    expect(await sendProposal(world.ctx, briefId, good)).toEqual({ ok: false, error: "stale-match" });
    await world.ctx.ports.store.put("profile", profile);
    await world.ctx.ports.store.remove("match", briefId);
    expect(await sendProposal(world.ctx, briefId, good)).toEqual({ ok: false, error: "no-match" });
  });

  it("allows one open proposal per brief, and a new one after a decline or withdrawal", async () => {
    const world = testWorld();
    const { briefId, proposalId } = await proposed(world);
    const again = { units: 2, pricePerUnit: 80, startsAt: at(world, 48 * HOUR), buyerName: "Sam Ortiz" };
    expect(await sendProposal(world.ctx, briefId, again)).toEqual({ ok: false, error: "already-proposed" });
    expect(await withdrawProposal(world.ctx, proposalId)).toMatchObject({ ok: true, value: { state: "withdrawn" } });
    expect(await withdrawProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-waiting" });
    expect((await sendProposal(world.ctx, briefId, again)).ok).toBe(true);
  });
});

describe("answering a proposal", () => {
  it("on acceptance holds the payment once, confirms the session and gives it a meeting link", async () => {
    const world = testWorld();
    const { ruthId, proposalId } = await proposed(world);
    await asRuth(world);
    const accepted = await acceptProposal(world.ctx, proposalId);
    if (!accepted.ok) throw new Error(accepted.error);
    const { session, payment } = accepted.value;
    expect(session).toMatchObject({ proposalId, expertId: ruthId, state: "confirmed", totalCents: 15_000, startsAt: at(world, 24 * HOUR), endsAt: at(world, 24 * HOUR + 30) });
    expect(session.meeting).toMatchObject({ standIn: true });
    expect(payment).toMatchObject({ id: proposalId, sessionId: session.id, amountCents: 15_000, feeCents: 1_500, owedCents: 13_500, state: "held", standIn: true });
    expect(await world.ctx.ports.store.get("proposal", proposalId)).toMatchObject({ state: "accepted" });
    expect(heldPayments(world)).toBe(1);
  });

  it("creates one session and one payment however many times acceptance is submitted", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    await asRuth(world);
    const results = [await acceptProposal(world.ctx, proposalId), await acceptProposal(world.ctx, proposalId), await acceptProposal(world.ctx, proposalId)];
    expect(results.every((r) => r.ok)).toBe(true);
    expect(new Set(results.map((r) => (r.ok ? r.value.session.id : ""))).size).toBe(1);
    expect(await world.ctx.ports.store.list("session")).toHaveLength(1);
    expect(await world.ctx.ports.store.list("payment")).toHaveLength(1);
    expect(heldPayments(world)).toBe(1);
  });

  it("finishes the booking when acceptance was interrupted after the hold", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    await asRuth(world);
    // The hold went through, then the connection was lost before the session was recorded.
    await world.ctx.ports.payments.hold(proposalId, 15_000);
    const accepted = await acceptProposal(world.ctx, proposalId);
    expect(accepted.ok).toBe(true);
    expect(await world.ctx.ports.store.list("session")).toHaveLength(1);
    expect(heldPayments(world)).toBe(1);
  });

  it("confirms nothing when the payment cannot be held, and can be tried again", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    await asRuth(world);
    world.payments.declineNext();
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "payment-failed" });
    expect(await world.ctx.ports.store.list("session")).toEqual([]);
    expect(await world.ctx.ports.store.list("payment")).toEqual([]);
    expect(await world.ctx.ports.store.get("proposal", proposalId)).toMatchObject({ state: "waiting" });
    expect((await acceptProposal(world.ctx, proposalId)).ok).toBe(true);
  });

  it("checks the price against the range in force when the expert answers", async () => {
    const world = testWorld();
    const { ruthId, proposalId } = await proposed(world);
    await asRuth(world);
    const profile = await world.ctx.ports.store.get("profile", ruthId);
    if (profile === null) throw new Error("no profile");
    await world.ctx.ports.store.put("profile", { ...profile, priceRange: { min: 80, max: 95 } });
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "price-outside-range" });
    expect(heldPayments(world)).toBe(0);
  });

  it("refuses a proposal whose time has passed", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world, 60);
    await asRuth(world);
    world.advance(61);
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "time-in-past" });
  });

  it("on decline holds nothing and lets the buyer propose again", async () => {
    const world = testWorld();
    const { briefId, proposalId } = await proposed(world);
    await asRuth(world);
    expect(await declineProposal(world.ctx, proposalId)).toMatchObject({ ok: true, value: { state: "declined" } });
    expect(await declineProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-waiting" });
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-waiting" });
    expect(heldPayments(world)).toBe(0);
    await asSam(world);
    expect((await sendProposal(world.ctx, briefId, { units: 2, pricePerUnit: 70, startsAt: at(world, 48 * HOUR), buyerName: "Sam Ortiz" })).ok).toBe(true);
  });

  it("lets the expert accept only one of two proposals for overlapping times", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world, 24 * HOUR);
    await signOut(world.ctx);
    const anaBrief = await samMatched(world, "ana@example.com");
    const ana = await sendProposal(world.ctx, anaBrief, { units: 2, pricePerUnit: 75, startsAt: at(world, 24 * HOUR + 15), buyerName: "Ana" });
    if (!ana.ok) throw new Error(ana.error);
    await asRuth(world);
    expect((await acceptProposal(world.ctx, proposalId)).ok).toBe(true);
    expect(await world.ctx.ports.store.get("proposal", ana.value.id)).toMatchObject({ state: "unavailable" });
    expect(await acceptProposal(world.ctx, ana.value.id)).toEqual({ ok: false, error: "not-waiting" });
    expect(heldPayments(world)).toBe(1);
  });

  it("is only for the expert the proposal was sent to", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    // The buyer cannot accept their own proposal.
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-yours" });
    expect(await declineProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-yours" });
    await signOut(world.ctx);
    await world.signInAs("walter@example.com");
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-yours" });
    expect(await declineProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-yours" });
    expect(await withdrawProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-yours" });
    expect(await myProposals(world.ctx)).toEqual({ ok: true, value: [] });
    await signOut(world.ctx);
    expect(await acceptProposal(world.ctx, proposalId)).toEqual({ ok: false, error: "not-signed-in" });
  });
});

describe("seeing proposals and sessions", () => {
  it("shows a proposal to its buyer and its expert, with each other's name and the problem", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    const mine = await myProposals(world.ctx);
    expect(mine).toMatchObject({ ok: true, value: [{ proposal: { id: proposalId }, buyerName: "Sam Ortiz", expertName: "Ruth Adeyemi", totalCents: 15_000 }] });
    await asRuth(world);
    const hers = await myProposals(world.ctx);
    expect(hers).toMatchObject({ ok: true, value: [{ proposal: { id: proposalId }, buyerName: "Sam Ortiz" }] });
    expect(hers.ok && hers.value[0]?.problem).toContain("contract manufacturer");
    expect(JSON.stringify(hers)).not.toContain("sam@example.com");
  });

  it("reports a missing counterparty as data rather than a name to translate", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    await asRuth(world);
    const accepted = await acceptProposal(world.ctx, proposalId);
    if (!accepted.ok) throw new Error(accepted.error);
    const { session } = accepted.value;
    await world.ctx.ports.store.remove("account", session.buyerId);

    expect(await mySession(world.ctx, session.id)).toMatchObject({ ok: true, value: { buyerName: null, expertName: "Ruth Adeyemi" } });
  });

  it("shows a session to its two people and to nobody else", async () => {
    const world = testWorld();
    const { proposalId } = await proposed(world);
    await asRuth(world);
    const accepted = await acceptProposal(world.ctx, proposalId);
    if (!accepted.ok) throw new Error(accepted.error);
    const id = accepted.value.session.id;
    expect(await mySession(world.ctx, id)).toMatchObject({ ok: true, value: { session: { id }, payment: { state: "held" }, buyerName: "Sam Ortiz", expertName: "Ruth Adeyemi" } });
    expect((await mySessions(world.ctx)).ok && (await mySessions(world.ctx).then((r) => (r.ok ? r.value.length : 0)))).toBe(1);
    await asSam(world);
    expect(await mySession(world.ctx, id)).toMatchObject({ ok: true, value: { session: { id } } });
    await signOut(world.ctx);
    await world.signInAs("walter@example.com");
    expect(await mySession(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    expect(await mySession(world.ctx, "no-such-session")).toEqual({ ok: false, error: "not-yours" });
    expect(await mySessions(world.ctx)).toEqual({ ok: true, value: [] });
  });
});
