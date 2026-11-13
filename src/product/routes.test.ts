import { describe, expect, it } from "vitest";
import type { Account } from "./model/types";
import { PRODUCT_HASH, href, isProductRoute, resolve } from "./routes";

const account = (roles: Account["roles"], activeRole: Account["activeRole"] = "expert"): Account => ({ id: "a1", email: "ruth@example.com", name: "Ruth", roles, activeRole, createdAt: "2026-11-14T00:00:00.000Z" });

describe("product routes", () => {
  it("knows which addresses belong to the product", () => {
    expect(isProductRoute("#/app")).toBe(true);
    expect(isProductRoute("#/app/home")).toBe(true);
    expect(isProductRoute("#/")).toBe(false);
    expect(isProductRoute("")).toBe(false);
    expect(isProductRoute("#/apple")).toBe(false);
  });

  it("builds addresses from route names", () => {
    expect(href("sign-in")).toBe(PRODUCT_HASH);
    expect(href("home")).toBe("#/app/home");
    expect(href("account")).toBe("#/app/account");
  });

  it("sends someone who is not signed in to sign-in, whatever they asked for", () => {
    for (const hash of ["#/app", "#/app/home", "#/app/account", "#/app/nothing-here"]) {
      expect(resolve(hash, null)).toEqual({ name: "sign-in", params: {}, href: "#/app" });
    }
  });

  it("sends someone who is signed in away from sign-in, to home", () => {
    expect(resolve("#/app", account(["expert"]))).toMatchObject({ name: "home", href: "#/app/home" });
  });

  it("opens the pages any signed-in person may open", () => {
    expect(resolve("#/app/home", account([]))).toMatchObject({ name: "home" });
    expect(resolve("#/app/account", account(["buyer"], "buyer"))).toMatchObject({ name: "account", href: "#/app/account" });
  });

  it("sends an unknown address to home", () => {
    expect(resolve("#/app/nothing-here", account(["expert"]))).toMatchObject({ name: "home", href: "#/app/home" });
    expect(resolve("#/app/home/extra", account(["expert"]))).toMatchObject({ name: "home" });
  });

  it("ignores a trailing slash", () => {
    expect(resolve("#/app/account/", account(["expert"]))).toMatchObject({ name: "account" });
  });

  it("opens the expert's pages only for someone acting as an expert", () => {
    for (const [path, name] of [["/expert/interview", "expert-interview"], ["/expert/profile", "expert-profile"], ["/expert/price", "expert-price"]] as const) {
      expect(resolve(`#/app${path}`, account(["expert"], "expert"))).toMatchObject({ name, href: `#/app${path}` });
      expect(resolve(`#/app${path}`, account(["expert", "buyer"], "buyer"))).toMatchObject({ name: "home" });
      expect(resolve(`#/app${path}`, null)).toMatchObject({ name: "sign-in" });
      expect(href(name)).toBe(`#/app${path}`);
    }
  });
});
