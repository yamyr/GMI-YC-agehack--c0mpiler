import { type ComponentType, useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { tryOutLimits } from "./copy";
import type { Account } from "./model/types";
import "./product.css";
import { type RouteName, type RouteParams, href, resolve } from "./routes";
import { browserContext } from "./runtime";
import { AccountScreen } from "./screens/AccountScreen";
import { BuyerBriefScreen } from "./screens/BuyerBriefScreen";
import { BuyerMatchScreen } from "./screens/BuyerMatchScreen";
import { BuyerProposalScreen } from "./screens/BuyerProposalScreen";
import { ExpertEarningsScreen } from "./screens/ExpertEarningsScreen";
import { ExpertInboxScreen } from "./screens/ExpertInboxScreen";
import { ExpertInterviewScreen } from "./screens/ExpertInterviewScreen";
import { ExpertPriceScreen } from "./screens/ExpertPriceScreen";
import { ExpertProfileScreen } from "./screens/ExpertProfileScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { SessionScreen } from "./screens/SessionScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { type ScreenProps, ServiceStatusList } from "./screens/shared";
import { signOut } from "./usecases/account";
import { actingAccount, type Context } from "./usecases/context";

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
  "expert-earnings": ExpertEarningsScreen,
  session: SessionScreen,
};

export function ProductApp() {
  const { t } = useI18n();
  const [ctx] = useState(browserContext);
  if (ctx !== null) return <ProductRoutes ctx={ctx} />;

  return (
    <div className="demo product">
      <div className="demo-stage">
        <h2>{t("Browser storage is unavailable")}</h2>
        <p>{t("Agely needs browser storage to keep this try-out on your device. Allow site data in your browser settings, then reload this page.")}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>{t("Try again")}</button>
      </div>
    </div>
  );
}

/** The signed-in product, running on stand-ins: a frame around whichever page the address names. */
function ProductRoutes({ ctx }: { readonly ctx: Context }) {
  const { t } = useI18n();
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

  // Only redirect the hash we resolved. A link may have changed it before hashchange arrives.
  useEffect(() => {
    if (page !== null && hash === window.location.hash && page.href !== hash) {
      window.history.replaceState(null, "", page.href);
      setHash(page.href);
    }
  }, [hash, page]);

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
      <p className="notice notice--info product-notice">
        {t("This is a try-out version of Agely. Accounts are for trying it out, your data stays on this device, and nothing you enter is private or permanent.")}
      </p>

      {account != null && (
        <nav className="product-nav" aria-label={t("Your Agely")}>
          <a href={href("home")} aria-current={page?.name === "home" ? "page" : undefined}>
            {t("Home")}
          </a>
          {account.roles.includes("expert") && account.activeRole === "expert" && (
            <>
              <a href={href("expert-inbox")} aria-current={page?.name === "expert-inbox" ? "page" : undefined}>
                {t("Inbox")}
              </a>
              <a href={href("expert-earnings")} aria-current={page?.name === "expert-earnings" ? "page" : undefined}>
                {t("Earnings")}
              </a>
            </>
          )}
          <a href={href("account")} aria-current={page?.name === "account" ? "page" : undefined}>
            {t("Account")}
          </a>
          <button type="button" className="quiet" onClick={() => void onSignOut()}>
            {t("Sign out")}
          </button>
        </nav>
      )}

      <div className="demo-stage">
        {page === null && <p className="lead">{t("Opening Agely…")}</p>}
        {page?.name === "sign-in" && <SignInScreen ctx={ctx} onSignedIn={refresh} />}
        {Screen !== null && account != null && page !== null && <Screen key={page.href} ctx={ctx} account={account} params={page.params} route={page.name} go={go} refresh={refresh} />}
      </div>

      <section className="services" aria-labelledby="services-title">
        <h2 id="services-title">{t("What is connected")}</h2>
        <ServiceStatusList ctx={ctx} />
        <h3>{t("What this try-out version can't do")}</h3>
        <ul className="plain-list">
          {tryOutLimits(t).map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
