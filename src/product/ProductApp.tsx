import { type FormEvent, useEffect, useMemo, useState } from "react";
import { SERVICE_NAMES, SIGN_IN_ERRORS, TRY_OUT_NOTICE } from "./copy";
import type { Account, Role } from "./model/types";
import type { ServiceStatus } from "./ports";
import "./product.css";
import { browserContext } from "./runtime";
import { chooseRole, requestSignInCode, signIn, signOut } from "./usecases/account";
import { actingAccount } from "./usecases/context";

type View =
  | { readonly at: "loading" }
  | { readonly at: "email"; readonly error?: string }
  | { readonly at: "code"; readonly email: string; readonly standInCode?: string; readonly error?: string }
  | { readonly at: "home"; readonly account: Account };

/** The signed-in product, running on stand-ins. This is the shell; the stories fill it in. */
export function ProductApp() {
  const ctx = useMemo(browserContext, []);
  const [view, setView] = useState<View>({ at: "loading" });
  const services: readonly ServiceStatus[] = Object.values(ctx.ports).map((port) => port.status);

  useEffect(() => {
    let cancelled = false;
    void actingAccount(ctx).then((acting) => {
      if (!cancelled) setView(acting.ok ? { at: "home", account: acting.value } : { at: "email" });
    });
    return () => {
      cancelled = true;
    };
  }, [ctx]);

  async function onEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const result = await requestSignInCode(ctx, email);
    setView(result.ok ? { at: "code", email, standInCode: result.standInCode } : { at: "email", error: SIGN_IN_ERRORS[result.error] });
  }

  async function onCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.at !== "code") return;
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const result = await signIn(ctx, view.email, code);
    setView(result.ok ? { at: "home", account: result.value } : { ...view, error: SIGN_IN_ERRORS[result.error] });
  }

  async function onRole(role: Role) {
    const result = await chooseRole(ctx, role);
    setView(result.ok ? { at: "home", account: result.value } : { at: "email" });
  }

  async function onSignOut() {
    await signOut(ctx);
    setView({ at: "email" });
  }

  return (
    <div className="demo product">
      <p className="notice notice--info product-notice">{TRY_OUT_NOTICE}</p>

      <div className="demo-stage">
        {view.at === "loading" && <p className="lead">Opening Agely…</p>}

        {view.at === "email" && (
          <form onSubmit={(e) => void onEmail(e)}>
            <h2>Sign in to try Agely</h2>
            <p className="lead">Tell us where to send a sign-in code. There is no password and nothing else to fill in.</p>
            <div className="field">
              <label htmlFor="product-email">Your email address</label>
              <input id="product-email" name="email" type="text" inputMode="email" autoComplete="email" required />
            </div>
            {view.error !== undefined && (
              <p className="notice notice--error" role="alert">
                {view.error}
              </p>
            )}
            <div className="actions">
              <button type="submit" className="primary">
                Send me a code
              </button>
            </div>
          </form>
        )}

        {view.at === "code" && (
          <form onSubmit={(e) => void onCode(e)}>
            <h2>Enter your code</h2>
            <p className="lead">We made a six-digit code for {view.email}.</p>
            {view.standInCode !== undefined && (
              <div className="stand-in" data-stand-in="sign-in">
                <p>{ctx.ports.auth.status.label}</p>
                <p className="stand-in__code">
                  Your code is <strong>{view.standInCode}</strong>
                </p>
              </div>
            )}
            <div className="field">
              <label htmlFor="product-code">Six-digit code</label>
              <input id="product-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required />
            </div>
            {view.error !== undefined && (
              <p className="notice notice--error" role="alert">
                {view.error}
              </p>
            )}
            <div className="actions">
              <button type="submit" className="primary">
                Sign in
              </button>
              <button type="button" className="quiet" onClick={() => setView({ at: "email" })}>
                Use a different address
              </button>
            </div>
          </form>
        )}

        {view.at === "home" && (
          <div>
            <h2>{view.account.roles.length === 0 ? "How do you want to use Agely?" : "You are signed in"}</h2>
            <p className="lead">
              Signed in as {view.account.email}
              {view.account.roles.length > 0 && (
                <>
                  , acting as {view.account.activeRole === "expert" ? "an expert" : "a buyer"}
                </>
              )}
              .
            </p>
            <div className="cards">
              <div className="card">
                <h3>I have experience to share</h3>
                <p>Talk to an agent, review the profile it drafts, and set your own price.</p>
                <div className="actions">
                  <button type="button" className={view.account.activeRole === "expert" && view.account.roles.includes("expert") ? "secondary" : "primary"} onClick={() => void onRole("expert")}>
                    Continue as an expert
                  </button>
                </div>
              </div>
              <div className="card">
                <h3>I need help with a problem</h3>
                <p>Describe it, confirm a brief, and see who fits and why.</p>
                <div className="actions">
                  <button type="button" className={view.account.activeRole === "buyer" && view.account.roles.includes("buyer") ? "secondary" : "primary"} onClick={() => void onRole("buyer")}>
                    Continue as a buyer
                  </button>
                </div>
              </div>
            </div>
            {view.account.roles.length > 0 && (
              <p className="notice notice--info">The {view.account.activeRole === "expert" ? "interview, profile and price" : "brief and match"} screens are the next part of this build.</p>
            )}
            <div className="actions">
              <button type="button" className="quiet" onClick={() => void onSignOut()}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="services" aria-labelledby="services-title">
        <h2 id="services-title">What is connected</h2>
        <ul className="plain-list">
          {services.map((status) => (
            <li key={status.service} data-stand-in={status.connected ? undefined : status.service}>
              <strong>{SERVICE_NAMES[status.service]}:</strong> {status.connected ? "connected" : status.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
