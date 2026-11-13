import { describe, expect, it } from "vitest";
import { makeStandInStore } from "../standins/store";
import { chooseRole, signOut } from "./account";
import { acceptProposal, declineProposal, myProposals, mySession, mySessions, sendProposal, withdrawProposal } from "./booking";
import { confirmBrief, draftBriefFromConversation, myBrief, myCurrentBrief, updateBrief } from "./brief";
import { myMatch, runMatch } from "./match";
import { confirmPrice, draftProfileFromInterview, myProfile, publishProfile } from "./profile";
import { cancelSession, markSessionHeld, myEarnings } from "./session";
import { type TestWorld, testWorld } from "./testing";

const DAY = 24 * 60;
const INTERVIEW = [
  { questionId: "work", text: "I ran procurement for a manufacturer for 34 years, negotiating with suppliers and contract manufacturers." },
  { questionId: "where", text: "Columbus, Ohio" },
];
const BRIEF = [
  { questionId: "problem", text: "I'm about to sign with a contract manufacturer." },
  { questionId: "length", text: "30 minutes" },
  { questionId: "budget", text: "$50 to $100" },
];

async function expertRuth(world: TestWorld): Promise<void> {
  await signOut(world.ctx);
  await world.signInAs("ruth@example.com");
  await chooseRole(world.ctx, "expert");
  await draftProfileFromInterview(world.ctx, "Ruth Adeyemi", INTERVIEW);
  await confirmPrice(world.ctx, { min: 60, max: 90 });
  await publishProfile(world.ctx);
}

/** A buyer with a confirmed, matched brief and a waiting proposal. Returns the brief and proposal ids. */
async function buyerProposes(world: TestWorld, email: string, startInMinutes: number): Promise<{ briefId: string; proposalId: string }> {
  await signOut(world.ctx);
  await world.signInAs(email);
  await chooseRole(world.ctx, "buyer");
  const drafted = await draftBriefFromConversation(world.ctx, BRIEF);
  if (!drafted.ok) throw new Error(drafted.error);
  await confirmBrief(world.ctx, drafted.value.id);
  await runMatch(world.ctx, drafted.value.id);
  const sent = await sendProposal(world.ctx, drafted.value.id, { units: 2, pricePerUnit: 75, startsAt: new Date(world.ctx.now().getTime() + startInMinutes * 60_000).toISOString(), buyerName: "Sam Ortiz" });
  if (!sent.ok) throw new Error(sent.error);
  return { briefId: drafted.value.id, proposalId: sent.value.id };
}

describe("SC-005: nobody can read or change what is not theirs", () => {
  it("gives a third person nothing, tells them nothing, and changes nothing, for every use case", async () => {
    const world = testWorld();
    await expertRuth(world);
    const waiting = await buyerProposes(world, "sam@example.com", DAY);
    const booked = await buyerProposes(world, "ana@example.com", 3 * DAY);
    await signOut(world.ctx);
    await world.signInAs("ruth@example.com");
    const accepted = await acceptProposal(world.ctx, booked.proposalId);
    if (!accepted.ok) throw new Error(accepted.error);
    const sessionId = accepted.value.session.id;

    await signOut(world.ctx);
    await world.signInAs("walter@example.com");
    await chooseRole(world.ctx, "buyer");
    const before = JSON.stringify(await Promise.all((["profile", "brief", "match", "proposal", "session", "payment"] as const).map((k) => world.ctx.ports.store.list(k))));

    const attempts: Record<string, unknown> = {
      myProfile: await myProfile(world.ctx),
      myCurrentBrief: await myCurrentBrief(world.ctx),
      myBrief: await myBrief(world.ctx, waiting.briefId),
      updateBrief: await updateBrief(world.ctx, waiting.briefId, { units: 1 }),
      confirmBrief: await confirmBrief(world.ctx, waiting.briefId),
      runMatch: await runMatch(world.ctx, waiting.briefId),
      myMatch: await myMatch(world.ctx, waiting.briefId),
      sendProposal: await sendProposal(world.ctx, waiting.briefId, { units: 2, pricePerUnit: 75, startsAt: new Date(world.ctx.now().getTime() + DAY * 60_000).toISOString(), buyerName: "Walter" }),
      withdrawProposal: await withdrawProposal(world.ctx, waiting.proposalId),
      acceptProposal: await acceptProposal(world.ctx, waiting.proposalId),
      declineProposal: await declineProposal(world.ctx, waiting.proposalId),
      myProposals: await myProposals(world.ctx),
      mySession: await mySession(world.ctx, sessionId),
      mySessions: await mySessions(world.ctx),
      cancelSession: await cancelSession(world.ctx, sessionId),
      markSessionHeld: await markSessionHeld(world.ctx, sessionId),
      myEarnings: await myEarnings(world.ctx),
    };

    const notYours = { ok: false, error: "not-yours" };
    for (const name of ["myBrief", "updateBrief", "confirmBrief", "runMatch", "myMatch", "sendProposal", "withdrawProposal", "acceptProposal", "declineProposal", "mySession", "cancelSession", "markSessionHeld"]) {
      expect(attempts[name], name).toEqual(notYours);
    }
    expect(attempts.myProfile).toEqual({ ok: true, value: null });
    expect(attempts.myCurrentBrief).toEqual({ ok: true, value: null });
    expect(attempts.myProposals).toEqual({ ok: true, value: [] });
    expect(attempts.mySessions).toEqual({ ok: true, value: [] });
    expect(attempts.myEarnings).toMatchObject({ ok: true, value: { released: [], owedCents: 0, pendingCents: 0 } });

    // Nothing about the other three people came back.
    expect(JSON.stringify(attempts)).not.toMatch(/Ruth|Sam Ortiz|ruth@|sam@|ana@|contract manufacturer/);
    // And nothing of theirs changed.
    const after = JSON.stringify(await Promise.all((["profile", "brief", "match", "proposal", "session", "payment"] as const).map((k) => world.ctx.ports.store.list(k))));
    expect(after).toBe(before);
  });
});

describe("SC-002: what was published is found again", () => {
  it("returns the same profile, price and state across 20 new sessions", async () => {
    const world = testWorld();
    await expertRuth(world);
    const published = await myProfile(world.ctx);
    if (!published.ok || published.value === null) throw new Error("no profile");
    for (let round = 0; round < 20; round += 1) {
      await signOut(world.ctx);
      await world.signInAs("ruth@example.com");
      expect(await myProfile(world.ctx), `round ${round}`).toEqual(published);
      // A new adapter over the same storage, as after closing and reopening the browser.
      expect(await makeStandInStore(world.kv).get("profile", published.value.id), `reopened, round ${round}`).toEqual(published.value);
    }
  });
});

describe("SC-004: every accepted proposal has exactly one held payment for the right amount", () => {
  it("holds once each across 50 acceptances with repeats and interruptions", async () => {
    const world = testWorld();
    await expertRuth(world);
    const proposals: string[] = [];
    for (let i = 0; i < 50; i += 1) proposals.push((await buyerProposes(world, `buyer${i}@example.com`, (i + 1) * DAY)).proposalId);

    await signOut(world.ctx);
    await world.signInAs("ruth@example.com");
    for (const [i, id] of proposals.entries()) {
      // Every third acceptance was interrupted after the hold; every second is submitted twice more.
      if (i % 3 === 0) await world.ctx.ports.payments.hold(id, 15_000);
      const submissions = i % 2 === 0 ? 3 : 1;
      for (let n = 0; n < submissions; n += 1) expect((await acceptProposal(world.ctx, id)).ok, `proposal ${i}, submission ${n}`).toBe(true);
    }

    const sessions = await world.ctx.ports.store.list("session");
    const payments = await world.ctx.ports.store.list("payment");
    expect(sessions).toHaveLength(50);
    expect(payments).toHaveLength(50);
    expect(new Set(sessions.map((s) => s.proposalId)).size).toBe(50);
    for (const payment of payments) expect(payment).toMatchObject({ amountCents: 15_000, feeCents: 1_500, owedCents: 13_500, state: "held" });
    for (const id of proposals) expect(await world.ctx.ports.payments.hold(id, 15_000), id).toMatchObject({ ok: true, payment: { state: "held", amountCents: 15_000 } });
  });
});
