import { useI18n } from "../../i18n";
import type { Dispatch, ReactNode } from "react";
import { type DemoAction, type DemoState, blockedReason, canAdvance, stepInfo } from "../state/reducer";
import { CHAPTERS, STEPS } from "../state/steps";
import { PersonaBanner } from "./PersonaBanner";

interface DemoChromeProps {
  readonly state: DemoState;
  readonly dispatch: Dispatch<DemoAction>;
  readonly children: ReactNode;
}

/** FR-002–FR-004a: demo label, progress, chapter jump, back / next / restart. */
export function DemoChrome({ state, dispatch, children }: DemoChromeProps) {
  const { t } = useI18n();

  const info = stepInfo(state);
  const isLast = state.step === STEPS.length - 1;
  const reason = blockedReason(state);

  return (
    <div className="demo">
      <div className="demo-bar">
        <span className="demo-label">{t("Demo — scripted data")}</span>
        <span className="demo-progress">{t("Step {0} of {1}{2}", info.number, info.total, info.chapter !== null ? ` · ${t(info.chapter)}` : "")}</span>
      </div>

      <nav aria-label={t("Chapters")}>
        <ol className="chapter-list">
          {CHAPTERS.map((chapter) => (
            <li key={chapter}>
              <button
                type="button"
                aria-current={info.chapter === chapter ? "step" : undefined}
                onClick={() => dispatch({ type: "jumpTo", chapter })}
              >
                {t(chapter)}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {info.persona !== null && <PersonaBanner persona={info.persona} />}

      <section className="demo-stage" aria-label={t(info.title)}>
        {children}
      </section>

      <div className="demo-nav">
        <button type="button" className="secondary" onClick={() => dispatch({ type: "back" })} disabled={state.step === 0}>{t("Back")}</button>
        <button type="button" className="quiet" onClick={() => dispatch({ type: "restart" })}>{t("Restart")}</button>
        <span className="demo-nav__spacer" />
        {reason !== null && !isLast && <span className="demo-nav__reason">{reason}</span>}
        {!isLast && (
          <button type="button" className="primary" onClick={() => dispatch({ type: "next" })} disabled={!canAdvance(state)}>{t("Next")}</button>
        )}
      </div>
    </div>
  );
}
