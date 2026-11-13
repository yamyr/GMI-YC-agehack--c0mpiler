import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { SERVICE_NAMES, TRY_OUT_NOTICE } from "./copy";
import type { Account } from "./model/types";
import { serviceStatuses } from "./ports";
import "./product.css";
import { type RouteName, type RouteParams, href, resolve } from "./routes";
import { browserContext } from "./runtime";
import { AccountScreen } from "./screens/AccountScreen";
import { BuyerBriefScreen } from "./screens/BuyerBriefScreen";
import { BuyerMatchScreen } from "./screens/BuyerMatchScreen";
import { BuyerProposalScreen } from "./screens/BuyerProposalScreen";
import { ExpertInboxScreen } from "./screens/ExpertInboxScreen";
import { ExpertInterviewScreen } from "./screens/ExpertInterviewScreen";
import { ExpertPriceScreen } from "./screens/ExpertPriceScreen";
import { ExpertProfileScreen } from "./screens/ExpertProfileScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { SessionScreen } from "./screens/SessionScreen";
import { SignInScreen } from "./screens/SignInScreen";
import type { ScreenProps } from "./screens/shared";
import { signOut } from "./usecases/account";
import { actingAccount } from "./usecases/context";

const SCREENS: Record<Exclude<RouteName, "sign-in">, ComponentType<ScreenProps>> = {
  home: HomeScreen,
  account: AccountScreen,
  "expert-interview": ExpertInterviewScreen,
  "expert-profile": ExpertProfileScreen,
  "expert-price": ExpertPriceScreen,
  "buyer-brief": BuyerBriefScreen,
  "buyer-brief-new": BuyerBriefScreen,
  "buyer-match": BuyerMatchScreen,
  "buyer-proposal": BuyerProposalScreen,
  "expert-inbox": ExpertInboxScreen,
  session: SessionScreen,
};

/** The signed-in product, running on stand-ins: a frame around whichever page the address names. */
export function ProductApp() {
  const ctx = useMemo(browserContext, []);
  // undefined while the first read is in flight; null when nobody is signed in.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [hash, setHash] = useState(() => window.location.hash);

  const refresh = useCallback(async () => {
    const acting = await actingAccount(ctx);
    setAccount(acting.ok ? acting.value : null);
  }, [ctx]);

  useEffect(() => {
    void refresh();
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [refresh]);

  const page = account === undefined ? null : resolve(hash, account);

  // Keep the address honest: if the person may not open what they asked for, show where they are.
  useEffect(() => {
    if (page !== null && page.href !== window.location.hash) {
      window.history.replaceState(null, "", page.href);
      setHash(page.href);
    }
  }, [page]);

  const go = useCallback((name: RouteName, params?: RouteParams) => {
    window.location.hash = href(name, params);
  }, []);

  async function onSignOut() {
    await signOut(ctx);
    await refresh();
  }

  const Screen = page !== null && page.name !== "sign-in" ? SCREENS[page.name] : null;

  return (
    <div className="demo product">
      <p className="notice notice--info product-notice">{TRY_OUT_NOTICE}</p>

      {account != null && (
        <nav className="product-nav" aria-label="Your Agely">
          <a href={href("home")} aria-current={page?.name === "home" ? "page" : undefined}>
            Home
          </a>
          <a href={href("account")} aria-current={page?.name === "account" ? "page" : undefined}>
            Account
          </a>
          <button type="button" className="quiet" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </nav>
      )}

      <div className="demo-stage">
        {page === null && <p className="lead">Opening Agely…</p>}
        {page?.name === "sign-in" && <SignInScreen ctx={ctx} onSignedIn={refresh} />}
        {Screen !== null && account != null && page !== null && <Screen key={page.href} ctx={ctx} account={account} params={page.params} route={page.name} go={go} refresh={refresh} />}
      </div>

      <section className="services" aria-labelledby="services-title">
        <h2 id="services-title">What is connected</h2>
        <ul className="plain-list">
          {serviceStatuses(ctx.ports).map((status) => (
            <li key={status.service} data-stand-in={status.connected ? undefined : status.service}>
              <strong>{SERVICE_NAMES[status.service]}:</strong> {status.connected ? "connected" : status.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
