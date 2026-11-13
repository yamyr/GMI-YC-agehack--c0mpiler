import { useI18n } from "../../i18n";
import { useState } from "react";
import { formatRange } from "../domain/price";
import { BRIEF_NOTE } from "../script/dev";
import { NoticeLine, type ScreenProps, ScriptedDraftNote, parseDollars } from "./shared";

/** FR-013–FR-015: the agent's draft brief, editable, confirmed by Dev. */
export function BriefScreen({ state, dispatch }: ScreenProps) {
  const { t, locale } = useI18n();

  const { brief } = state;
  const [min, setMin] = useState(String(brief.budget.min));
  const [max, setMax] = useState(String(brief.budget.max));

  const setBudget = (nextMin: string, nextMax: string) => {
    setMin(nextMin);
    setMax(nextMax);
    dispatch({ type: "editBrief", patch: { budget: { min: parseDollars(nextMin), max: parseDollars(nextMax) } } });
  };

  return (
    <div>
      <h2 tabIndex={-1}>{t("Dev's brief")}</h2>
      <p>
        <span className={`badge ${brief.confirmed ? "badge--done" : "badge--draft"}`}>
          {brief.confirmed ? t("Confirmed") : t("Draft — check and confirm")}
        </span>
      </p>

      <ScriptedDraftNote state={state} after="brief" />
      <div className="field">
        <label htmlFor="brief-problem">{t("The problem, in one sentence")}</label>
        <textarea
          id="brief-problem"
          value={brief.problem}
          onChange={(e) => dispatch({ type: "editBrief", patch: { problem: e.target.value } })}
        />
      </div>

      <div className="cards" style={{ marginTop: "var(--space-4)" }}>
        <div className="card">
          <p className="muted">{t("Competency needed")}</p>
          <p>
            <strong>{brief.competencyLabel}</strong>
          </p>
        </div>
        <div className="card">
          <p className="muted">{t("Session length")}</p>
          <p>{t("{0} minutes ({1} × 15 min)", brief.units * 15, brief.units)}</p>
        </div>
      </div>

      <div className="field-row" style={{ marginTop: "var(--space-4)" }}>
        <div className="field">
          <label htmlFor="budget-min">{t("Budget from, per 15 minutes ($)")}</label>
          <input id="budget-min" inputMode="numeric" value={min} onChange={(e) => setBudget(e.target.value, max)} />
        </div>
        <div className="field">
          <label htmlFor="budget-max">{t("Budget up to, per 15 minutes ($)")}</label>
          <input id="budget-max" inputMode="numeric" value={max} onChange={(e) => setBudget(min, e.target.value)} />
        </div>
      </div>
      {Number.isFinite(brief.budget.min) && Number.isFinite(brief.budget.max) && (
        <p className="muted">{t("Budget: {0} per 15 minutes", formatRange(brief.budget, locale))}</p>
      )}

      <p className="notice notice--info">{t(BRIEF_NOTE)}</p>
      <NoticeLine notice={state.notice} />

      {!brief.confirmed && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => dispatch({ type: "confirmBrief" })}>{t("Confirm my brief")}</button>
        </div>
      )}
    </div>
  );
}
