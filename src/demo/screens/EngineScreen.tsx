import { useI18n } from "../../i18n";
import { formatUsd } from "../domain/money";
import { deriveEngine } from "../state/reducer";
import type { ScreenProps } from "./shared";

const ROADMAP: readonly (readonly [string, string])[] = [
  ["Today", "The engine confirms Margaret's level and prepares her for each session."],
  ["Next", "It carries out follow-up work the way she would, and she reviews it."],
  ["Then", "Buyers consult the engine directly, within limits Margaret sets, so she earns beyond her hours."],
  ["Later", "Engines from several experts work together on problems no one person covers."],
];

/** FR-024: approved workflows, sessions completed, earnings to date. */
export function EngineScreen({ state, dispatch }: ScreenProps) {
  const { t, locale } = useI18n();

  const engine = deriveEngine(state);
  return (
    <div>
      <h2 tabIndex={-1}>{t("Margaret's engine")}</h2>
      <p className="lead">{t("Every session teaches the engine how Margaret thinks. Her judgement keeps working after her career.")}</p>
      <div className="stat-row">
        <div className="stat">
          <span className="stat__value">{engine.workflows.length}</span>
          <span className="stat__label">{locale === "en" ? (engine.workflows.length === 1 ? "workflow" : "workflows") : t("Workflows")}</span>
        </div>
        <div className="stat">
          <span className="stat__value">{engine.sessionsCompleted}</span>
          <span className="stat__label">{locale === "en" ? (engine.sessionsCompleted === 1 ? "session completed" : "sessions completed") : t("Sessions completed")}</span>
        </div>
        <div className="stat">
          <span className="stat__value">{formatUsd(engine.earnings, locale)}</span>
          <span className="stat__label">{t("earned")}</span>
        </div>
      </div>

      <h3>{t("Approved workflows")}</h3>
      {engine.workflows.length === 0 ? (
        <p className="muted">{t("None yet.")}</p>
      ) : (
        <ul className="plain-list">
          {engine.workflows.map((w) => (
            <li key={w.name}>{w.name}</li>
          ))}
        </ul>
      )}

      <h3>{t("Where the engine goes next")}</h3>
      <ul className="plain-list">
        {ROADMAP.map(([when, what]) => (
          <li key={when}>
            <strong>{t("{0}:", t(when))}</strong> {t(what)}
          </li>
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="secondary" onClick={() => dispatch({ type: "restart" })}>{t("Run the walkthrough again")}</button>
      </div>
    </div>
  );
}
