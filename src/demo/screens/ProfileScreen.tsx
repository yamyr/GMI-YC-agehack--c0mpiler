import type { Translator } from "../../../site/i18n/core.js";
import { useI18n } from "../../i18n";
import { useState } from "react";
import { Transcript } from "../chrome/Conversation";
import type { Competency } from "../domain/types";
import { PROFILE_PROMPT, PROFILE_REPLIES } from "../script/margaret";
import { NoticeLine, type ScreenProps, ScriptedDraftNote } from "./shared";

function sourceText(competency: Competency, t: Translator): string {
  return competency.source.kind === "interview"
    ? t("From the interview (line {0})", competency.source.turn)
    : t("From: {0}", competency.source.name);
}

function TypedEdit({ competency, dispatch }: { readonly competency: Competency } & Pick<ScreenProps, "dispatch">) {
  const { t } = useI18n();

  const [label, setLabel] = useState(competency.label);
  const inputId = `skill-${competency.id}`;
  return (
    <div className="field-row">
      <div className="field">
        <label htmlFor={inputId}>{t("Rename “{0}”", competency.label)}</label>
        <input id={inputId} type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <button type="button" className="secondary" onClick={() => dispatch({ type: "editCompetency", id: competency.id, label })}>{t("Save name")}</button>
      <button type="button" className="danger" onClick={() => dispatch({ type: "removeCompetency", id: competency.id })}>{t("Remove")}</button>
    </div>
  );
}

/** FR-006–FR-009, FR-012: the draft, how to change it by talking, and the explicit publish. */
export function ProfileScreen({ state, dispatch }: ScreenProps) {
  const { t } = useI18n();

  const { margaret } = state;
  return (
    <div>
      <h2 tabIndex={-1}>{margaret.published ? t("Margaret's profile is live") : t("Margaret's draft profile")}</h2>
      <p>
        <span className={`badge ${margaret.published ? "badge--done" : "badge--draft"}`}>
          {margaret.published ? t("Published") : t("Draft — not published")}
        </span>
      </p>

      <ScriptedDraftNote state={state} after="interview" />
      <div className="card">
        <h3>{t("{0}, {1}", margaret.name, margaret.age)}</h3>
        <p>{margaret.headline}</p>
        <p className="muted">{t("{0} years of experience · {1} · Credentials are self-declared", margaret.yearsExperience, margaret.location)}</p>
        <h3>{t("Skills")}</h3>
        <ul className="plain-list" style={{ listStyle: "none", paddingLeft: 0 }}>
          {margaret.competencies.map((c) => (
            <li key={c.id} className="competency">
              <div className="competency__label">{c.label}</div>
              <div>{c.description}</div>
              <div className="competency__source">{sourceText(c, t)}</div>
            </li>
          ))}
        </ul>
        <h3>{t("Problems Margaret can help with")}</h3>
        <ul className="plain-list">
          {margaret.exampleProblems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <Transcript turns={[{ speaker: "agent", text: t(PROFILE_PROMPT) }, ...state.exchanges.profile]} agentName={t("Onboarding agent")} />
      <div className="replies" role="group" aria-label={t("Margaret can say")}>
        {PROFILE_REPLIES.map((reply) => (
          <button key={reply.id} type="button" onClick={() => dispatch({ type: "replyToAgent", replyId: reply.id })}>{t("“{0}”", t(reply.text))}</button>
        ))}
      </div>

      <details className="typed">
        <summary>{t("Or type the change yourself")}</summary>
        {margaret.competencies.map((c) => (
          <TypedEdit key={`${c.id}:${c.label}`} competency={c} dispatch={dispatch} />
        ))}
      </details>

      <NoticeLine notice={state.notice} />

      <div className="actions">
        {!margaret.published && (
          <button type="button" className="primary" onClick={() => dispatch({ type: "publishProfile" })}>{t("Publish my profile")}</button>
        )}
        <button type="button" className="quiet" onClick={() => dispatch({ type: "redoInterview" })}>{t("Start the interview again")}</button>
      </div>
    </div>
  );
}
