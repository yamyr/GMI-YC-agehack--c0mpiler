import { type FormEvent, useEffect, useState } from "react";
import { restrictedAdviceMessage } from "../../demo/domain/advice";
import { validateRange } from "../../demo/domain/price";
import type { AdviceCategory } from "../../demo/domain/advice";
import type { PriceRange } from "../../demo/domain/types";
import { useI18n } from "../../i18n";
import { parseDollars } from "../../i18n/digits";
import { skillByTag } from "../model/catalogue";
import { lengthText } from "../model/times";
import type { Brief } from "../model/types";
import type { AgentQuestion, InterviewAnswer } from "../ports";
import { href } from "../routes";
import { confirmBrief, draftBriefFromConversation, myCurrentBrief, updateBrief } from "../usecases/brief";
import { displayAnswer, Exchange, ReplyPicker, type ScreenProps, StandIn } from "./shared";

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
type ReviewError =
  | { readonly kind: "range"; readonly range: PriceRange }
  | { readonly kind: "restricted"; readonly category: AdviceCategory }
  | { readonly kind: "invalid-brief" | "save" | "confirm" };

/** Story 2: describe a problem in conversation, then check and confirm the brief (FR-007). */
export function BuyerBriefScreen({ ctx, route, go }: ScreenProps) {
  const { locale, t } = useI18n();
  const fresh = route === "buyer-brief-new";
  const [brief, setBrief] = useState<Brief | null | undefined>(fresh ? null : undefined);
  const [questions, setQuestions] = useState<readonly AgentQuestion[]>([]);
  const [answers, setAnswers] = useState<readonly InterviewAnswer[]>([]);
  const [unmatched, setUnmatched] = useState(false);
  const [error, setError] = useState<ReviewError | null>(null);

  useEffect(() => {
    void ctx.ports.agent.briefQuestions().then(setQuestions);
    if (!fresh) void myCurrentBrief(ctx).then((result) => setBrief(result.ok ? result.value : null));
  }, [ctx, fresh]);

  if (brief === undefined) return <p className="lead">{t("Opening your brief…")}</p>;

  if (brief === null) {
    const current = questions[answers.length];
    const give = async (text: string, suggested: boolean) => {
      if (current === undefined) return;
      const next = [...answers, { questionId: current.id, text, suggested, locale }];
      if (next.length < questions.length) {
        setAnswers(next);
        return;
      }
      const result = await draftBriefFromConversation(ctx, next, locale);
      if (result.ok) {
        if (fresh) go("buyer-brief");
        else setBrief(result.value);
      } else {
        setUnmatched(true);
        setAnswers([]);
      }
    };
    return (
      <div>
        <h2 tabIndex={-1}>{t("What do you need help with?")}</h2>
        <StandIn ctx={ctx} service="agent" />
        {unmatched && (
          <p className="notice notice--error" role="alert">
            {t("I couldn't tell which kind of experience you need. Describe the problem in a little more detail.")}
          </p>
        )}
        <div className="conversation">
          {questions.slice(0, answers.length + 1).map((question, index) => (
            <Exchange key={question.id} question={t(question.text)} answer={displayAnswer(answers[index], t)} />
          ))}
        </div>
        {current !== undefined && <ReplyPicker key={current.id} question={current} onAnswer={(text, suggested) => void give(text, suggested)} />}
      </div>
    );
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (brief == null) return;
    const data = new FormData(event.currentTarget);
    const edit = {
      problem: String(data.get("problem") ?? ""),
      units: Number(data.get("units")),
      budget: { min: parseDollars(String(data.get("min") ?? "")), max: parseDollars(String(data.get("max") ?? "")) },
    };
    const changed = edit.problem.trim() !== brief.problem || edit.units !== brief.units || edit.budget.min !== brief.budget.min || edit.budget.max !== brief.budget.max;
    if (changed || brief.state === "draft") {
      if (!validateRange(edit.budget).ok) return setError({ kind: "range", range: edit.budget });
      const updated = await updateBrief(ctx, brief.id, edit);
      if (!updated.ok) return setError({ kind: updated.error === "invalid-brief" ? "invalid-brief" : "save" });
      setBrief(updated.value);
      const confirmed = await confirmBrief(ctx, brief.id);
      if (!confirmed.ok) {
        return setError(confirmed.error === "restricted-advice" ? { kind: "restricted", category: confirmed.category } : { kind: "confirm" });
      }
    }
    setError(null);
    go("buyer-match");
  }

  const confirmed = brief.state === "confirmed";
  const skill = skillByTag(brief.skillTag);

  function reviewErrorMessage(failure: ReviewError): string {
    switch (failure.kind) {
      case "range": {
        const check = validateRange(failure.range, locale);
        return check.ok ? "" : check.message;
      }
      case "restricted": return restrictedAdviceMessage(failure.category, locale);
      case "invalid-brief": return t("Please describe the problem in a sentence before confirming.");
      case "save": return t("This brief could not be saved.");
      case "confirm": return t("This brief could not be confirmed.");
    }
  }

  return (
    <form onSubmit={(e) => void onConfirm(e)}>
      <h2 tabIndex={-1}>{t("Your brief")}</h2>
      <p>
        <span className={confirmed ? "badge badge--done" : "badge badge--draft"}>{t(confirmed ? "Confirmed" : "Draft: check and confirm")}</span>
      </p>
      <StandIn ctx={ctx} service="agent" />
      <div className="field">
        <label htmlFor="brief-problem">{t("The problem, in one sentence")}</label>
        <input id="brief-problem" name="problem" type="text" defaultValue={brief.problem} required />
      </div>
      <p>{t("Skill needed: {0}", skill === undefined ? brief.skillTag : t(skill.label))}</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="brief-units">{t("Session length")}</label>
          <select id="brief-units" name="units" defaultValue={brief.units}>
            {LENGTHS.map((units) => (
              <option key={units} value={units}>
                {lengthText(units, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="brief-min">{t("Lowest budget per 15 minutes")}</label>
          <input id="brief-min" name="min" type="text" inputMode="numeric" defaultValue={brief.budget.min} required />
        </div>
        <div className="field">
          <label htmlFor="brief-max">{t("Highest budget per 15 minutes")}</label>
          <input id="brief-max" name="max" type="text" inputMode="numeric" defaultValue={brief.budget.max} required />
        </div>
      </div>
      <p className="notice notice--info">{t("Agely doesn't give legal, medical or financial advice. A brief that asks for it can't be sent.")}</p>
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {reviewErrorMessage(error)}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          {t("Confirm my brief")}
        </button>
        {confirmed && (
          <a className="button-link" href={href("buyer-match")}>
            {t("See my match")}
          </a>
        )}
        <a className="button-link button-link--quiet" href={href("buyer-brief-new")}>
          {t("Start a new brief")}
        </a>
      </div>
    </form>
  );
}
