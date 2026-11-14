import { type FormEvent, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import type { AgentQuestion, InterviewAnswer } from "../ports";
import { draftProfileFromInterview } from "../usecases/profile";
import { displayAnswer, Exchange, ReplyPicker, type ScreenProps, StandIn } from "./shared";

/**
 * Story 1: the expert talks; nothing is filled in. Each question can be answered by picking a
 * reply or by typing one (principle I). The name comes first (R13).
 */
export function ExpertInterviewScreen({ ctx, account, go, refresh }: ScreenProps) {
  const { locale, t } = useI18n();
  const [questions, setQuestions] = useState<readonly AgentQuestion[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [answers, setAnswers] = useState<readonly InterviewAnswer[]>([]);
  const [notice, setNotice] = useState<"unmatched" | "save-failed" | null>(null);

  useEffect(() => {
    void ctx.ports.agent.interviewQuestions().then(setQuestions);
  }, [ctx]);

  const current = questions[answers.length];

  async function give(text: string, suggested: boolean) {
    if (current === undefined || name === null || text.trim() === "") return;
    const next = [...answers, { questionId: current.id, text: text.trim(), suggested, locale }];
    if (next.length < questions.length) {
      setAnswers(next);
      return;
    }
    const result = await draftProfileFromInterview(ctx, name, next, locale);
    if (result.ok) {
      await refresh();
      go("expert-profile");
    } else if (result.error === "unmatched") {
      setNotice("unmatched");
      setAnswers([]);
    } else {
      setNotice("save-failed");
    }
  }

  function onName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const given = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (given !== "") setName(given);
  }

  return (
    <div>
      <h2 tabIndex={-1}>{t("Tell us about your work")}</h2>
      <StandIn ctx={ctx} service="agent" />
      {notice !== null && (
        <p className="notice notice--error" role="alert">
          {t(notice === "unmatched"
            ? "I couldn't find a skill I recognise in what you said. Tell me more about the work you did and what you were responsible for."
            : "Something went wrong saving your answers. Please try again.")}
        </p>
      )}

      <div className="conversation">
        <Exchange question={t("What should people call you?")} answer={name ?? undefined} />
        {name !== null && questions.slice(0, answers.length + 1).map((question, index) => (
          <Exchange key={question.id} question={t(question.text)} answer={displayAnswer(answers[index], t)} />
        ))}
      </div>

      {name === null && (
        <form onSubmit={onName}>
          <div className="field">
            <label htmlFor="interview-name">{t("Your name")}</label>
            <input id="interview-name" name="name" type="text" autoComplete="name" defaultValue={account.name} required />
          </div>
          <div className="actions">
            <button type="submit" className="primary">
              {t("That's my name")}
            </button>
          </div>
        </form>
      )}

      {name !== null && current !== undefined && <ReplyPicker key={current.id} question={current} onAnswer={(text, suggested) => void give(text, suggested)} />}
    </div>
  );
}
