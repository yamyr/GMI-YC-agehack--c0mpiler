/**
 * Addresses inside the product. It lives under the URL hash `#/app`, beside the walkthrough
 * (research R1), and every page below it is one row of this table (R15).
 */
import type { Account, Role } from "./model/types";

export const PRODUCT_HASH = "#/app";

export function isProductRoute(hash: string): boolean {
  return hash === PRODUCT_HASH || hash.startsWith(`${PRODUCT_HASH}/`);
}

/** Who may open a page: anyone signed in, or only someone acting in a role. */
type Access = "signed-in" | Role;

export type RouteName = "sign-in" | "home" | "account" | "expert-interview" | "expert-profile" | "expert-price" | "buyer-brief" | "buyer-brief-new" | "buyer-match" | "buyer-proposal" | "expert-inbox" | "expert-earnings" | "session";

const ROUTES: Readonly<Record<RouteName, { readonly path: string; readonly access: Access | null }>> = {
  "sign-in": { path: "", access: null },
  home: { path: "/home", access: "signed-in" },
  account: { path: "/account", access: "signed-in" },
  "expert-interview": { path: "/expert/interview", access: "expert" },
  "expert-profile": { path: "/expert/profile", access: "expert" },
  "expert-price": { path: "/expert/price", access: "expert" },
  "buyer-brief": { path: "/buyer/brief", access: "buyer" },
  "buyer-brief-new": { path: "/buyer/brief/new", access: "buyer" },
  "buyer-match": { path: "/buyer/match", access: "buyer" },
  "buyer-proposal": { path: "/buyer/proposal", access: "buyer" },
  "expert-inbox": { path: "/expert/inbox", access: "expert" },
  "expert-earnings": { path: "/expert/earnings", access: "expert" },
  session: { path: "/session/:id", access: "signed-in" },
};
export type RouteParams = Readonly<Record<string, string>>;

export interface Resolved {
  readonly name: RouteName;
  readonly params: RouteParams;
  /** The address this page should have. When it differs from what was asked for, redirect. */
  readonly href: string;
}

export function href(name: RouteName, params: RouteParams = {}): string {
  const path = ROUTES[name].path.replace(/:([a-z]+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ""));
  return `${PRODUCT_HASH}${path}`;
}

function match(path: string): { name: RouteName; params: RouteParams } | null {
  const asked = path.split("/").filter(Boolean);
  for (const name of Object.keys(ROUTES) as RouteName[]) {
    const pattern = ROUTES[name].path.split("/").filter(Boolean);
    if (pattern.length !== asked.length) continue;
    const params: Record<string, string> = {};
    const fits = pattern.every((part, i) => {
      const value = asked[i] ?? "";
      if (part.startsWith(":")) {
        params[part.slice(1)] = decodeURIComponent(value);
        return true;
      }
      return part === value;
    });
    if (fits) return { name, params };
  }
  return null;
}

const at = (name: RouteName, params: RouteParams = {}): Resolved => ({ name, params, href: href(name, params) });

/**
 * The page to show for an address and a person. Someone signed out always gets sign-in; an
 * address that does not exist, or that the person's active role may not open, becomes home
 * (FR-004). This decides what is drawn; the use cases still refuse what a person may not do.
 */
export function resolve(hash: string, account: Account | null): Resolved {
  if (account === null) return at("sign-in");
  const found = match(hash.slice(PRODUCT_HASH.length));
  if (found === null || found.name === "sign-in") return at("home");
  const { access } = ROUTES[found.name];
  if ((access === "expert" || access === "buyer") && account.activeRole !== access) return at("home");
  return at(found.name, found.params);
}
