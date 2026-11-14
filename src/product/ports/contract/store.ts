import { describe, expect, it } from "vitest";
import type { Account, Brief } from "../../model/types";
import type { StorePort } from "../index";

const account = (id: string, email = `${id}@example.com`): Account => ({ id, email, name: "", roles: ["expert"], activeRole: "expert", createdAt: "2026-11-14T00:00:00.000Z" });
const brief = (id: string, buyerId: string, state: Brief["state"] = "draft"): Brief => ({ id, buyerId, problem: "p", skillTag: "sales", units: 2, budget: { min: 50, max: 100 }, state, createdAt: "2026-11-14T00:00:00.000Z" });

/**
 * Behaviour every StorePort adapter must show. `make` returns a fresh, empty store; `reopen`
 * returns a second adapter over the same underlying storage as the last `make`.
 */
export function storeContract(name: string, make: () => StorePort, reopen: () => StorePort): void {
  describe(`StorePort contract: ${name}`, () => {
    it("returns null for something that was never stored", async () => {
      expect(await make().get("account", "nobody")).toBeNull();
    });

    it("returns what was put, and replaces on a second put with the same id", async () => {
      const store = make();
      await store.put("account", account("a1"));
      expect(await store.get("account", "a1")).toEqual(account("a1"));
      await store.put("account", { ...account("a1"), name: "Ruth" });
      expect((await store.get("account", "a1"))?.name).toBe("Ruth");
      expect(await store.list("account")).toHaveLength(1);
    });

    it("keeps kinds apart", async () => {
      const store = make();
      await store.put("account", account("x"));
      expect(await store.get("brief", "x")).toBeNull();
      expect(await store.list("brief")).toEqual([]);
    });

    it("lists only entities whose named fields are equal", async () => {
      const store = make();
      await store.put("brief", brief("b1", "sam"));
      await store.put("brief", brief("b2", "sam", "confirmed"));
      await store.put("brief", brief("b3", "ana"));
      expect((await store.list("brief", { buyerId: "sam" })).map((b) => b.id).sort()).toEqual(["b1", "b2"]);
      expect((await store.list("brief", { buyerId: "sam", state: "confirmed" })).map((b) => b.id)).toEqual(["b2"]);
      expect(await store.list("brief", { buyerId: "nobody" })).toEqual([]);
    });

    it("hands out copies, so changing a result does not change what is stored", async () => {
      const store = make();
      await store.put("account", account("a1"));
      const got = (await store.get("account", "a1")) as { name: string };
      got.name = "changed";
      const listed = (await store.list("account"))[0] as { name: string };
      listed.name = "changed";
      expect((await store.get("account", "a1"))?.name).toBe("");
    });

    it("removes, and removing something absent is not an error", async () => {
      const store = make();
      await store.put("account", account("a1"));
      await store.remove("account", "a1");
      await store.remove("account", "a1");
      expect(await store.get("account", "a1")).toBeNull();
    });

    it("keeps every write of a transaction that completes", async () => {
      const store = make();
      const result = await store.transaction(async (tx) => {
        await tx.put("account", account("a1"));
        await tx.put("brief", brief("b1", "a1"));
        return "done";
      });
      expect(result).toBe("done");
      expect(await store.get("account", "a1")).not.toBeNull();
      expect(await store.get("brief", "b1")).not.toBeNull();
    });

    it("leaves the store as it was when a transaction fails part-way", async () => {
      const store = make();
      await store.put("account", account("kept"));
      await expect(
        store.transaction(async (tx) => {
          await tx.put("account", account("lost"));
          await tx.remove("account", "kept");
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(await store.get("account", "lost")).toBeNull();
      expect(await store.get("account", "kept")).not.toBeNull();
    });

    it("is read by a new adapter over the same storage", async () => {
      await make().put("account", account("a1"));
      expect(await reopen().get("account", "a1")).toEqual(account("a1"));
    });

    it("says whether it is a stand-in", () => {
      const { status } = make();
      expect(status.service).toBe("storage");
      expect(status.label.length).toBeGreaterThan(10);
    });
  });
}
