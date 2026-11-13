import { describe, expect, it } from "vitest";
import type { AuthPort } from "../index";

export interface AuthHarness {
  readonly auth: AuthPort;
  /** A second adapter over the same storage. */
  reopen(): AuthPort;
  /** Move the adapter's clock forward. */
  advance(minutes: number): void;
  /** The code most recently issued for an email, however the adapter delivers it. */
  codeFor(email: string): string;
}

/** Behaviour every AuthPort adapter must show. */
export function authContract(name: string, make: () => AuthHarness): void {
  const signIn = async (h: AuthHarness, email: string): Promise<string> => {
    expect((await h.auth.requestCode(email)).ok).toBe(true);
    const result = await h.auth.confirmCode(email, h.codeFor(email));
    if (!result.ok) throw new Error(`sign-in failed: ${result.error}`);
    return result.accountId;
  };

  describe(`AuthPort contract: ${name}`, () => {
    it("refuses something that is not an email address", async () => {
      const h = make();
      for (const bad of ["", "ruth", "ruth@", "@example.com", "ruth @example.com"]) {
        expect(await h.auth.requestCode(bad)).toEqual({ ok: false, error: "invalid-email" });
      }
    });

    it("signs a person in with the code that was issued", async () => {
      const h = make();
      expect(await h.auth.current()).toBeNull();
      const id = await signIn(h, "ruth@example.com");
      expect(id.length).toBeGreaterThan(0);
      expect(await h.auth.current()).toBe(id);
    });

    it("refuses a wrong code and does not sign anyone in", async () => {
      const h = make();
      await h.auth.requestCode("ruth@example.com");
      const wrong = h.codeFor("ruth@example.com") === "000000" ? "111111" : "000000";
      expect(await h.auth.confirmCode("ruth@example.com", wrong)).toEqual({ ok: false, error: "wrong-code" });
      expect(await h.auth.current()).toBeNull();
    });

    it("refuses a code for an email that never asked for one", async () => {
      expect(await make().auth.confirmCode("nobody@example.com", "123456")).toEqual({ ok: false, error: "wrong-code" });
    });

    it("lets a code be used once", async () => {
      const h = make();
      await h.auth.requestCode("ruth@example.com");
      const code = h.codeFor("ruth@example.com");
      expect((await h.auth.confirmCode("ruth@example.com", code)).ok).toBe(true);
      expect(await h.auth.confirmCode("ruth@example.com", code)).toEqual({ ok: false, error: "used" });
    });

    it("refuses a code after it has expired", async () => {
      const h = make();
      await h.auth.requestCode("ruth@example.com");
      const code = h.codeFor("ruth@example.com");
      h.advance(11);
      expect(await h.auth.confirmCode("ruth@example.com", code)).toEqual({ ok: false, error: "expired" });
    });

    it("replaces the previous code when a new one is requested", async () => {
      const h = make();
      await h.auth.requestCode("ruth@example.com");
      const first = h.codeFor("ruth@example.com");
      await h.auth.requestCode("ruth@example.com");
      const second = h.codeFor("ruth@example.com");
      if (first !== second) {
        expect((await h.auth.confirmCode("ruth@example.com", first)).ok).toBe(false);
      }
      expect((await h.auth.confirmCode("ruth@example.com", second)).ok).toBe(true);
    });

    it("gives the same email the same account, ignoring case and spaces, and a new email a new one", async () => {
      const h = make();
      const first = await signIn(h, "ruth@example.com");
      await h.auth.signOut();
      const again = await signIn(h, "  Ruth@Example.COM ");
      await h.auth.signOut();
      const other = await signIn(h, "sam@example.com");
      expect(again).toBe(first);
      expect(other).not.toBe(first);
    });

    it("reports the email in its normal form when a code is confirmed", async () => {
      const h = make();
      await h.auth.requestCode(" Ruth@Example.com ");
      const result = await h.auth.confirmCode("RUTH@example.com", h.codeFor("ruth@example.com"));
      expect(result).toMatchObject({ ok: true, email: "ruth@example.com" });
    });

    it("signs out, and stays signed in across a new adapter until then", async () => {
      const h = make();
      const id = await signIn(h, "ruth@example.com");
      expect(await h.reopen().current()).toBe(id);
      await h.auth.signOut();
      expect(await h.auth.current()).toBeNull();
      expect(await h.reopen().current()).toBeNull();
    });

    it("only a stand-in shows the code to the person", async () => {
      const h = make();
      const result = await h.auth.requestCode("ruth@example.com");
      expect(result.ok && result.standInCode !== undefined).toBe(!h.auth.status.connected);
      expect(h.auth.status.service).toBe("sign-in");
    });
  });
}
