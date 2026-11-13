import type { FormEvent } from "react";
import type { Account } from "../model/types";
import { type AgentQuestion, type ServiceName, serviceStatuses } from "../ports";
import type { RouteName, RouteParams } from "../routes";
import type { Context } from "../usecases/context";

/** What every signed-in screen is given. Screens call use cases with `ctx`; never a port. */
export interface ScreenProps {
  readonly ctx: Context;
  readonly account: Account;
  readonly params: RouteParams;
  /** Which page this is, for screens that serve more than one address. */
  readonly route: RouteName;
  /** Go to another page. */
  readonly go: (name: RouteName, params?: RouteParams) => void;
  /** Re-read the signed-in account after a use case changed it. */
  readonly refresh: () => Promise<void>;
}

/**
 * The label a screen shows when what is on it depends on a stand-in (FR-022). The dashed border
 * is the same mark Agely uses for drafts and demo data.
 */
export function StandIn({ ctx, service, children }: { readonly ctx: Context; readonly service: ServiceName; readonly children?: React.ReactNode }) {
  const status = serviceStatuses(ctx.ports).find((s) => s.service === service);
  if (status === undefined || status.connected) return <>{children}</>;
  return (
    <div className="stand-in" data-stand-in={service}>
      <p>{status.label}</p>
      {children}
    </div>
  );
}

/**
 * How a person answers the agent: pick a suggested reply, or type one (principle I). Keyed by
 * question by its caller, so the typing panel closes again for each new question.
 */
export function ReplyPicker({ question, onAnswer }: { readonly question: AgentQuestion; readonly onAnswer: (text: string) => void }) {
  function onTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("answer") ?? "").trim();
    form.reset();
    if (text !== "") onAnswer(text);
  }
  return (
    <div>
      <div className="replies" role="group" aria-label="Suggested replies">
        {question.suggestedReplies.map((reply) => (
          <button key={reply} type="button" className="secondary" onClick={() => onAnswer(reply)}>
            {reply}
          </button>
        ))}
      </div>
      <details className="type-instead">
        <summary>Or type your answer</summary>
        <form onSubmit={onTyped}>
          <div className="field">
            <label htmlFor={`answer-${question.id}`}>Your answer</label>
            <input id={`answer-${question.id}`} name="answer" type="text" required />
          </div>
          <div className="actions">
            <button type="submit" className="secondary">
              Send my answer
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

/** One question-and-answer exchange in a conversation. */
export function Exchange({ question, answer }: { readonly question: string; readonly answer?: string }) {
  return (
    <div>
      <div className="turn turn--agent">
        <p className="turn__speaker">Agely</p>
        <p>{question}</p>
      </div>
      {answer !== undefined && (
        <div className="turn turn--person">
          <p className="turn__speaker">You</p>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
