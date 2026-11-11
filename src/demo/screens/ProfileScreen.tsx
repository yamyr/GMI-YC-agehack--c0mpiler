import { useState } from "react";
import { Transcript } from "../chrome/Conversation";
import type { Competency } from "../domain/types";
import { PROFILE_PROMPT, PROFILE_REPLIES } from "../script/margaret";
import { NoticeLine, type ScreenProps, ScriptedDraftNote } from "./shared";

function sourceText(competency: Competency): string {
  return competency.source.kind === "interview"
    ? `From the interview (line ${competency.source.turn})`
    : `From: ${competency.source.name}`;
}

function TypedEdit({ competency, dispatch }: { readonly competency: Competency } & Pick<ScreenProps, "dispatch">) {
  const [label, setLabel] = useState(competency.label);
  const inputId = `skill-${competency.id}`;
  return (
    <div className="field-row">
      <div className="field">
        <label htmlFor={inputId}>Rename “{competency.label}”</label>
        <input id={inputId} type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <button type="button" className="secondary" onClick={() => dispatch({ type: "editCompetency", id: competency.id, label })}>
        Save name
      </button>
      <button type="button" className="danger" onClick={() => dispatch({ type: "removeCompetency", id: competency.id })}>
        Remove
      </button>
    </div>
  );
}

/** FR-006–FR-009, FR-012: the draft, how to change it by talking, and the explicit publish. */
export function ProfileScreen({ state, dispatch }: ScreenProps) {
  const { margaret } = state;
  return (
    <div>
      <h2 tabIndex={-1}>{margaret.published ? "Margaret's profile is live" : "Margaret's draft profile"}</h2>
      <p>
        <span className={`badge ${margaret.published ? "badge--done" : "badge--draft"}`}>
          {margaret.published ? "Published" : "Draft — not published"}
        </span>
      </p>

      <ScriptedDraftNote state={state} after="interview" />
      <div className="card">
        <h3>
          {margaret.name}, {margaret.age}
        </h3>
        <p>{margaret.headline}</p>
        <p className="muted">
          {margaret.yearsExperience} years of experience · {margaret.location} · Credentials are self-declared
        </p>
        <h3>Skills</h3>
        <ul className="plain-list" style={{ listStyle: "none", paddingLeft: 0 }}>
          {margaret.competencies.map((c) => (
            <li key={c.id} className="competency">
              <div className="competency__label">{c.label}</div>
              <div>{c.description}</div>
              <div className="competency__source">{sourceText(c)}</div>
            </li>
          ))}
        </ul>
        <h3>Problems Margaret can help with</h3>
        <ul className="plain-list">
          {margaret.exampleProblems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <Transcript turns={[{ speaker: "agent", text: PROFILE_PROMPT }, ...state.exchanges.profile]} agentName="Onboarding agent" />
      <div className="replies" role="group" aria-label="Margaret can say">
        {PROFILE_REPLIES.map((reply) => (
          <button key={reply.id} type="button" onClick={() => dispatch({ type: "replyToAgent", replyId: reply.id })}>
            “{reply.text}”
          </button>
        ))}
      </div>

      <details className="typed">
        <summary>Or type the change yourself</summary>
        {margaret.competencies.map((c) => (
          <TypedEdit key={`${c.id}:${c.label}`} competency={c} dispatch={dispatch} />
        ))}
      </details>

      <NoticeLine notice={state.notice} />

      <div className="actions">
        {!margaret.published && (
          <button type="button" className="primary" onClick={() => dispatch({ type: "publishProfile" })}>
            Publish my profile
          </button>
        )}
        <button type="button" className="quiet" onClick={() => dispatch({ type: "redoInterview" })}>
          Start the interview again
        </button>
      </div>
    </div>
  );
}
