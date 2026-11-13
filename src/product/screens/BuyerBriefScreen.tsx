import { type FormEvent, useEffect, useState } from "react";
import { restrictedAdviceMessage } from "../../demo/domain/advice";
import { validateRange } from "../../demo/domain/price";
import { skillByTag } from "../model/catalogue";
import type { Brief } from "../model/types";
import type { AgentQuestion, InterviewAnswer } from "../ports";
import { href } from "../routes";
import { confirmBrief, draftBriefFromConversation, myCurrentBrief, updateBrief } from "../usecases/brief";
import { Exchange, ReplyPicker, type ScreenProps, StandIn } from "./shared";

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const lengthText = (units: number): string => (units * 15 < 60 ? `${units * 15} minutes` : units === 4 ? "1 hour" : units === 8 ? "2 hours" : `${Math.floor(units / 4)} hour ${(units % 4) * 15} minutes`);

/** Story 2: describe a problem in conversation, then check and confirm the brief (FR-007). */
export function BuyerBriefScreen({ ctx, route, go }: ScreenProps) {
  const fresh = route === "buyer-brief-new";
  const [brief, setBrief] = useState<Brief | null | undefined>(fresh ? null : undefined);
  const [questions, setQuestions] = useState<readonly AgentQuestion[]>([]);
  const [answers, setAnswers] = useState<readonly InterviewAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ctx.ports.agent.briefQuestions().then(setQuestions);
    if (!fresh) void myCurrentBrief(ctx).then((result) => setBrief(result.ok ? result.value : null));
  }, [ctx, fresh]);

  if (brief === undefined) return <p className="lead">Opening your brief…</p>;

  if (brief === null) {
    const current = questions[answers.length];
    const give = async (text: string) => {
      if (current === undefined) return;
      const next = [...answers, { questionId: current.id, text }];
      if (next.length < questions.length) {
        setAnswers(next);
        return;
      }
      const result = await draftBriefFromConversation(ctx, next);
      if (result.ok) {
        if (fresh) go("buyer-brief");
        else setBrief(result.value);
      } else {
        setError("I couldn't tell which kind of experience you need. Describe the problem in a little more detail.");
        setAnswers([]);
      }
    };
    return (
      <div>
        <h2 tabIndex={-1}>What do you need help with?</h2>
        <StandIn ctx={ctx} service="agent" />
        {error !== null && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <div className="conversation">
          {questions.slice(0, answers.length + 1).map((question, index) => (
            <Exchange key={question.id} question={question.text} answer={answers[index]?.text} />
          ))}
        </div>
        {current !== undefined && <ReplyPicker key={current.id} question={current} onAnswer={(text) => void give(text)} />}
      </div>
    );
  }

  async function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (brief == null) return;
    const data = new FormData(event.currentTarget);
    const edit = { problem: String(data.get("problem") ?? ""), units: Number(data.get("units")), budget: { min: Number(data.get("min")), max: Number(data.get("max")) } };
    const changed = edit.problem.trim() !== brief.problem || edit.units !== brief.units || edit.budget.min !== brief.budget.min || edit.budget.max !== brief.budget.max;
    if (changed || brief.state === "draft") {
      const budget = validateRange(edit.budget);
      if (!budget.ok) return setError(budget.message);
      const updated = await updateBrief(ctx, brief.id, edit);
      if (!updated.ok) return setError(updated.error === "invalid-brief" ? "Please describe the problem in a sentence before confirming." : "This brief could not be saved.");
      setBrief(updated.value);
      const confirmed = await confirmBrief(ctx, brief.id);
      if (!confirmed.ok) return setError(confirmed.error === "restricted-advice" ? restrictedAdviceMessage(confirmed.category) : "This brief could not be confirmed.");
    }
    setError(null);
    go("buyer-match");
  }

  const confirmed = brief.state === "confirmed";

  return (
    <form onSubmit={(e) => void onConfirm(e)}>
      <h2 tabIndex={-1}>Your brief</h2>
      <p>
        <span className={confirmed ? "badge badge--done" : "badge badge--draft"}>{confirmed ? "Confirmed" : "Draft: check and confirm"}</span>
      </p>
      <StandIn ctx={ctx} service="agent" />
      <div className="field">
        <label htmlFor="brief-problem">The problem, in one sentence</label>
        <input id="brief-problem" name="problem" type="text" defaultValue={brief.problem} required />
      </div>
      <p>Skill needed: {skillByTag(brief.skillTag)?.label ?? brief.skillTag}</p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="brief-units">Session length</label>
          <select id="brief-units" name="units" defaultValue={brief.units}>
            {LENGTHS.map((units) => (
              <option key={units} value={units}>
                {lengthText(units)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="brief-min">Lowest budget per 15 minutes</label>
          <input id="brief-min" name="min" type="number" min={1} step={1} defaultValue={brief.budget.min} required />
        </div>
        <div className="field">
          <label htmlFor="brief-max">Highest budget per 15 minutes</label>
          <input id="brief-max" name="max" type="number" min={1} step={1} defaultValue={brief.budget.max} required />
        </div>
      </div>
      <p className="notice notice--info">Agely doesn't give legal, medical or financial advice. A brief that asks for it can't be sent.</p>
      {error !== null && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          Confirm my brief
        </button>
        {confirmed && (
          <a className="button-link" href={href("buyer-match")}>
            See my match
          </a>
        )}
        <a className="button-link button-link--quiet" href={href("buyer-brief-new")}>
          Start a new brief
        </a>
      </div>
    </form>
  );
}
