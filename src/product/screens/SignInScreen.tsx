import { type FormEvent, useState } from "react";
import { SIGN_IN_ERRORS } from "../copy";
import { requestSignInCode, signIn } from "../usecases/account";
import type { Context } from "../usecases/context";
import { StandIn } from "./shared";

type Step = { readonly at: "email"; readonly error?: string } | { readonly at: "code"; readonly email: string; readonly standInCode?: string; readonly error?: string };

/** FR-001: sign in by confirming a code, with no password and one thing to type. */
export function SignInScreen({ ctx, onSignedIn }: { readonly ctx: Context; readonly onSignedIn: () => Promise<void> }) {
  const [step, setStep] = useState<Step>({ at: "email" });

  async function onEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const result = await requestSignInCode(ctx, email);
    setStep(result.ok ? { at: "code", email, standInCode: result.standInCode } : { at: "email", error: SIGN_IN_ERRORS[result.error] });
  }

  async function onCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.at !== "code") return;
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const result = await signIn(ctx, step.email, code);
    if (result.ok) await onSignedIn();
    else setStep({ ...step, error: SIGN_IN_ERRORS[result.error] });
  }

  if (step.at === "email") {
    return (
      <form onSubmit={(e) => void onEmail(e)}>
        <h2>Sign in to try Agely</h2>
        <p className="lead">Tell us where to send a sign-in code. There is no password and nothing else to fill in.</p>
        <div className="field">
          <label htmlFor="product-email">Your email address</label>
          <input id="product-email" name="email" type="text" inputMode="email" autoComplete="email" required />
        </div>
        {step.error !== undefined && (
          <p className="notice notice--error" role="alert">
            {step.error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary">
            Send me a code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void onCode(e)}>
      <h2>Enter your code</h2>
      <p className="lead">We made a six-digit code for {step.email}.</p>
      {step.standInCode !== undefined && (
        <StandIn ctx={ctx} service="sign-in">
          <p className="stand-in__code">
            Your code is <strong>{step.standInCode}</strong>
          </p>
        </StandIn>
      )}
      <div className="field">
        <label htmlFor="product-code">Six-digit code</label>
        <input id="product-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required />
      </div>
      {step.error !== undefined && (
        <p className="notice notice--error" role="alert">
          {step.error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          Sign in
        </button>
        <button type="button" className="quiet" onClick={() => setStep({ at: "email" })}>
          Use a different address
        </button>
      </div>
    </form>
  );
}
