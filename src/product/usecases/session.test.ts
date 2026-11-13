import { describe, expect, it } from "vitest";
import { tryOutClock } from "../standins/clock";
import { memory } from "../standins/kv";
import { PAYMENTS_KEY } from "../standins/payments";
import { chooseRole, signOut } from "./account";
import { acceptProposal, mySession, sendProposal } from "./booking";
import { confirmBrief, draftBriefFromConversation } from "./brief";
import { runMatch } from "./match";
import { cancelSession, markSessionHeld, myEarnings } from "./session";
import { type TestWorld, testWorld } from "./testing";

const DAY = 24 * 60;

/** A confirmed 30-minute session at $75 per 15 minutes, starting a day from now. Leaves Ruth signed in. */
async function booked(world: TestWorld, buyerEmail = "sam@example.com", startInMinutes = DAY): Promise<string> {
  await signOut(world.ctx);
  const ruthId = await world.signInAs("ruth@example.com");
  await chooseRole(world.ctx, "expert");
  await world.ctx.ports.store.put("account", { id: ruthId, email: "ruth@example.com", name: "Ruth Adeyemi", roles: ["expert"], activeRole: "expert", createdAt: world.ctx.now().toISOString() });
  await world.ctx.ports.store.put("profile", { id: ruthId, headline: "h", location: "", yearsExperience: 34, skills: [{ id: "s1", tag: "contract-manufacturing", label: "Contract manufacturing terms", description: "", source: { kind: "interview", turn: 1 } }], exampleProblems: [], priceRange: { min: 60, max: 90 }, priceConfirmed: true, state: "published", selfDeclared: true });
  await signOut(world.ctx);

  await world.signInAs(buyerEmail);
  await chooseRole(world.ctx, "buyer");
  const drafted = await draftBriefFromConversation(world.ctx, [
    { questionId: "problem", text: "I'm about to sign with a contract manufacturer." },
    { questionId: "length", text: "30 minutes" },
    { questionId: "budget", text: "$50 to $100" },
  ]);
  if (!drafted.ok) throw new Error(drafted.error);
  await confirmBrief(world.ctx, drafted.value.id);
  await runMatch(world.ctx, drafted.value.id);
  const sent = await sendProposal(world.ctx, drafted.value.id, { units: 2, pricePerUnit: 75, startsAt: new Date(world.ctx.now().getTime() + startInMinutes * 60_000).toISOString(), buyerName: "Sam Ortiz" });
  if (!sent.ok) throw new Error(sent.error);
  await signOut(world.ctx);
  await world.signInAs("ruth@example.com");
  const accepted = await acceptProposal(world.ctx, sent.value.id);
  if (!accepted.ok) throw new Error(accepted.error);
  return accepted.value.session.id;
}

const as = async (world: TestWorld, email: string): Promise<void> => {
  await signOut(world.ctx);
  await world.signInAs(email);
};
const standInState = (world: TestWorld): string[] => Object.values(JSON.parse(world.kv.getItem(PAYMENTS_KEY) ?? "{}") as Record<string, { state: string }>).map((p) => p.state);

describe("where a session stands", () => {
  it("is upcoming, then awaiting confirmation once its end has passed", async () => {
    const world = testWorld();
    const id = await booked(world);
    expect(await mySession(world.ctx, id)).toMatchObject({ ok: true, value: { phase: "upcoming" } });
    world.advance(DAY + 29);
    expect(await mySession(world.ctx, id)).toMatchObject({ ok: true, value: { phase: "upcoming" } });
    world.advance(2);
    expect(await mySession(world.ctx, id)).toMatchObject({ ok: true, value: { phase: "awaiting", payment: { state: "held" } } });
  });
});

describe("marking a session as held", () => {
  it("releases the payment to the expert, less the fee, only after the session has ended", async () => {
    const world = testWorld();
    const id = await booked(world);
    expect(await markSessionHeld(world.ctx, id)).toEqual({ ok: false, error: "not-finished" });
    world.advance(DAY + 31);
    const held = await markSessionHeld(world.ctx, id);
    expect(held).toMatchObject({ ok: true, value: { phase: "held", session: { state: "held" }, payment: { state: "released", amountCents: 15_000, feeCents: 1_500, owedCents: 13_500 } } });
    expect(standInState(world)).toEqual(["released"]);
    // Saying it again changes nothing.
    expect(await markSessionHeld(world.ctx, id)).toEqual(held);
    expect(standInState(world)).toEqual(["released"]);
  });

  it("is the expert's to do, not the buyer's or anyone else's", async () => {
    const world = testWorld();
    const id = await booked(world);
    world.advance(DAY + 31);
    await as(world, "sam@example.com");
    expect(await markSessionHeld(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    await as(world, "walter@example.com");
    expect(await markSessionHeld(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    await signOut(world.ctx);
    expect(await markSessionHeld(world.ctx, id)).toEqual({ ok: false, error: "not-signed-in" });
    expect(standInState(world)).toEqual(["held"]);
  });
});

describe("cancelling a session", () => {
  it("lifts the hold when either person cancels before it starts", async () => {
    for (const who of ["ruth@example.com", "sam@example.com"]) {
      const world = testWorld();
      const id = await booked(world);
      await as(world, who);
      expect(await cancelSession(world.ctx, id)).toMatchObject({ ok: true, value: { phase: "cancelled", session: { state: "cancelled" }, payment: { state: "lifted" } } });
      expect(standInState(world)).toEqual(["lifted"]);
      expect(await cancelSession(world.ctx, id)).toEqual({ ok: false, error: "not-confirmed" });
      world.advance(DAY + 31);
      await as(world, "ruth@example.com");
      expect(await markSessionHeld(world.ctx, id)).toEqual({ ok: false, error: "not-confirmed" });
    }
  });

  it("is refused once the session has started, and for anyone else", async () => {
    const world = testWorld();
    const id = await booked(world);
    await as(world, "walter@example.com");
    expect(await cancelSession(world.ctx, id)).toEqual({ ok: false, error: "not-yours" });
    await as(world, "sam@example.com");
    world.advance(DAY + 1);
    expect(await cancelSession(world.ctx, id)).toEqual({ ok: false, error: "already-started" });
    expect(standInState(world)).toEqual(["held"]);
  });

  it("frees the time, so the expert can accept another session then", async () => {
    const world = testWorld();
    const first = await booked(world, "sam@example.com");
    await cancelSession(world.ctx, first);
    const second = await booked(world, "ana@example.com");
    expect(second).not.toBe(first);
  });
});

describe("an expert's earnings", () => {
  it("lists released sessions with price, fee and amount owed shown separately", async () => {
    const world = testWorld();
    const id = await booked(world);
    expect(await myEarnings(world.ctx)).toMatchObject({ ok: true, value: { released: [], owedCents: 0, pendingCents: 15_000 } });
    world.advance(DAY + 31);
    await markSessionHeld(world.ctx, id);
    const earnings = await myEarnings(world.ctx);
    expect(earnings).toMatchObject({ ok: true, value: { paidCents: 15_000, feeCents: 1_500, owedCents: 13_500, pendingCents: 0 } });
    expect(earnings.ok && earnings.value.released).toHaveLength(1);
    expect(earnings.ok && earnings.value.released[0]).toMatchObject({ buyerName: "Sam Ortiz", payment: { amountCents: 15_000, feeCents: 1_500, owedCents: 13_500 } });
  });

  it("counts only the acting expert's own sessions, and none for a buyer", async () => {
    const world = testWorld();
    const id = await booked(world);
    world.advance(DAY + 31);
    await markSessionHeld(world.ctx, id);
    await as(world, "sam@example.com");
    expect(await myEarnings(world.ctx)).toMatchObject({ ok: true, value: { released: [], owedCents: 0, pendingCents: 0 } });
    await as(world, "walter@example.com");
    expect(await myEarnings(world.ctx)).toMatchObject({ ok: true, value: { released: [], owedCents: 0 } });
    await signOut(world.ctx);
    expect(await myEarnings(world.ctx)).toEqual({ ok: false, error: "not-signed-in" });
  });

  it("leaves a cancelled session out", async () => {
    const world = testWorld();
    await cancelSession(world.ctx, await booked(world));
    expect(await myEarnings(world.ctx)).toMatchObject({ ok: true, value: { released: [], owedCents: 0, pendingCents: 0 } });
  });
});

describe("the try-out clock", () => {
  it("moves the product's time forward and back to the real time, and remembers across reloads", () => {
    const kv = memory();
    let real = new Date("2026-11-14T12:00:00.000Z").getTime();
    const clock = tryOutClock(kv, () => real);
    expect(clock.now().toISOString()).toBe("2026-11-14T12:00:00.000Z");
    expect(clock.offsetMinutes()).toBe(0);
    clock.advance(DAY);
    clock.advance(90);
    expect(clock.now().toISOString()).toBe("2026-11-15T13:30:00.000Z");
    expect(tryOutClock(kv, () => real).offsetMinutes()).toBe(DAY + 90);
    real += 60_000;
    expect(clock.now().toISOString()).toBe("2026-11-15T13:31:00.000Z");
    clock.reset();
    expect(clock.now().getTime()).toBe(real);
    expect(tryOutClock(kv, () => real).offsetMinutes()).toBe(0);
  });

  it("only moves forward", () => {
    const clock = tryOutClock(memory(), () => 0);
    clock.advance(-60);
    clock.advance(Number.NaN);
    expect(clock.offsetMinutes()).toBe(0);
  });
});
