import { describe, expect, it } from "vitest";
import { chooseRole, requestSignInCode, setName, signIn, signOut } from "./account";
import { actingAccount, owned } from "./context";
import { testWorld } from "./testing";

describe("signing in", () => {
  it("creates an account the first time, with no role chosen yet", async () => {
    const { ctx } = testWorld();
    const requested = await requestSignInCode(ctx, "Ruth@Example.com");
    if (!requested.ok || requested.standInCode === undefined) throw new Error("no code");
    const result = await signIn(ctx, "ruth@example.com", requested.standInCode);
    expect(result).toMatchObject({ ok: true, value: { email: "ruth@example.com", roles: [], createdAt: "2026-11-14T12:00:00.000Z" } });
    expect((await ctx.ports.store.list("account")).length).toBe(1);
  });

  it("finds the same account, with its roles, on a later sign-in", async () => {
    const world = testWorld();
    const first = await world.signInAs("ruth@example.com");
    await chooseRole(world.ctx, "expert");
    await signOut(world.ctx);
    const again = await world.signInAs("ruth@example.com");
    expect(again).toBe(first);
    expect((await actingAccount(world.ctx))).toMatchObject({ ok: true, value: { roles: ["expert"] } });
    expect((await world.ctx.ports.store.list("account")).length).toBe(1);
  });

  it("passes on a refused code without creating anything", async () => {
    const { ctx } = testWorld();
    await requestSignInCode(ctx, "ruth@example.com");
    expect(await signIn(ctx, "ruth@example.com", "nope")).toEqual({ ok: false, error: "wrong-code" });
    expect(await ctx.ports.store.list("account")).toEqual([]);
  });
});

describe("roles", () => {
  it("adds a role once and switches the active one", async () => {
    const world = testWorld();
    await world.signInAs("ruth@example.com");
    expect(await chooseRole(world.ctx, "expert")).toMatchObject({ ok: true, value: { roles: ["expert"], activeRole: "expert" } });
    expect(await chooseRole(world.ctx, "buyer")).toMatchObject({ ok: true, value: { roles: ["expert", "buyer"], activeRole: "buyer" } });
    expect(await chooseRole(world.ctx, "expert")).toMatchObject({ ok: true, value: { roles: ["expert", "buyer"], activeRole: "expert" } });
  });

  it("refuses when nobody is signed in", async () => {
    const world = testWorld();
    expect(await chooseRole(world.ctx, "expert")).toEqual({ ok: false, error: "not-signed-in" });
    await world.signInAs("ruth@example.com");
    await signOut(world.ctx);
    expect(await chooseRole(world.ctx, "expert")).toEqual({ ok: false, error: "not-signed-in" });
  });
});

describe("ownership", () => {
  it("gives the same refusal for someone else's thing and for a thing that does not exist", async () => {
    const world = testWorld();
    await world.signInAs("ruth@example.com");
    const acting = await actingAccount(world.ctx);
    if (!acting.ok) throw new Error("not signed in");
    const theirs = { ownerId: "someone-else" };
    const mine = { ownerId: acting.value.id };
    expect(owned(theirs, acting.value, (t) => [t.ownerId])).toEqual({ ok: false, error: "not-yours" });
    expect(owned(null as { ownerId: string } | null, acting.value, (t) => [t.ownerId])).toEqual({ ok: false, error: "not-yours" });
    expect(owned(mine, acting.value, (t) => [t.ownerId])).toEqual({ ok: true, value: mine });
  });
});

describe("names", () => {
  it("stores what the person asks to be called, trimmed", async () => {
    const world = testWorld();
    await world.signInAs("ruth@example.com");
    expect(await setName(world.ctx, "  Ruth Adeyemi ")).toMatchObject({ ok: true, value: { name: "Ruth Adeyemi" } });
    expect(await actingAccount(world.ctx)).toMatchObject({ ok: true, value: { name: "Ruth Adeyemi" } });
  });

  it("refuses an empty name and a signed-out person", async () => {
    const world = testWorld();
    expect(await setName(world.ctx, "Ruth")).toEqual({ ok: false, error: "not-signed-in" });
    await world.signInAs("ruth@example.com");
    expect(await setName(world.ctx, "   ")).toEqual({ ok: false, error: "empty-name" });
  });
});
