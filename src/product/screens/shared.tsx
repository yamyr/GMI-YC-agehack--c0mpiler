import type { FormEvent } from "react";
import type { Translator } from "../../../site/i18n/core.js";
import { useI18n } from "../../i18n";
import { serviceNames } from "../copy";
import type { Account } from "../model/types";
import { type AgentQuestion, type InterviewAnswer, type ServiceName, serviceStatuses } from "../ports";
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
  const { t } = useI18n();
  const status = serviceStatuses(ctx.ports).find((s) => s.service === service);
  if (status === undefined || status.connected) return <>{children}</>;
  return (
    <div className="stand-in" data-stand-in={service}>
      <p>{t(status.label)}</p>
      {children}
    </div>
  );
}

export function ServiceStatusList({ ctx }: { readonly ctx: Context }) {
  const { t } = useI18n();
  const names = serviceNames(t);
  return (
    <ul className="plain-list">
      {serviceStatuses(ctx.ports).map((status) => (
        <li key={status.service} data-stand-in={status.connected ? undefined : status.service}>
          <strong>{t("{0}:", names[status.service])}</strong> {status.connected ? t("connected") : t(status.label)}
        </li>
      ))}
    </ul>
  );
}

/**
 * How a person answers the agent: pick a suggested reply, or type one (principle I). Keyed by
 * question by its caller, so the typing panel closes again for each new question.
 */
export function ReplyPicker({ question, onAnswer }: { readonly question: AgentQuestion; readonly onAnswer: (text: string, suggested: boolean) => void }) {
  const { t } = useI18n();

  function onTyped(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("answer") ?? "").trim();
    form.reset();
    if (text !== "") onAnswer(text, false);
  }
  return (
    <div>
      <div className="replies" role="group" aria-label={t("Suggested replies")}>
        {question.suggestedReplies.map((reply) => (
          <button key={reply} type="button" className="secondary" onClick={() => onAnswer(reply, true)}>
            {t(reply)}
          </button>
        ))}
      </div>
      <details className="type-instead">
        <summary>{t("Or type your answer")}</summary>
        <p className="muted">{t("This practice agent recognizes a limited set of skill phrases. Try a suggested reply if it misses what you mean.")}</p>
        <form onSubmit={onTyped}>
          <div className="field">
            <label htmlFor={`answer-${question.id}`}>{t("Your answer")}</label>
            <input id={`answer-${question.id}`} name="answer" type="text" required />
          </div>
          <div className="actions">
            <button type="submit" className="secondary">
              {t("Send my answer")}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

export function displayAnswer(answer: InterviewAnswer | undefined, t: Translator): string | undefined {
  return answer?.suggested ? t(answer.text) : answer?.text;
}

/** One question-and-answer exchange in a conversation. */
export function Exchange({ question, answer }: { readonly question: string; readonly answer?: string }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="turn turn--agent">
        <p className="turn__speaker">Agely</p>
        <p>{question}</p>
      </div>
      {answer !== undefined && (
        <div className="turn turn--person">
          <p className="turn__speaker">{t("You")}</p>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}
