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
  const info = stepInfo(state);
  const isLast = state.step === STEPS.length - 1;
  const reason = blockedReason(state);

  return (
    <div className="demo">
      <div className="demo-bar">
        <span className="demo-label">Demo — scripted data</span>
        <span className="demo-progress">
          Step {info.number} of {info.total}
          {info.chapter !== null ? ` · ${info.chapter}` : ""}
        </span>
      </div>

      <nav aria-label="Chapters">
        <ol className="chapter-list">
          {CHAPTERS.map((chapter) => (
            <li key={chapter}>
              <button
                type="button"
                aria-current={info.chapter === chapter ? "step" : undefined}
                onClick={() => dispatch({ type: "jumpTo", chapter })}
              >
                {chapter}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {info.persona !== null && <PersonaBanner persona={info.persona} />}

      <section className="demo-stage" aria-label={info.title}>
        {children}
      </section>

      <div className="demo-nav">
        <button type="button" className="secondary" onClick={() => dispatch({ type: "back" })} disabled={state.step === 0}>
          Back
        </button>
        <button type="button" className="quiet" onClick={() => dispatch({ type: "restart" })}>
          Restart
        </button>
        <span className="demo-nav__spacer" />
        {reason !== null && !isLast && <span className="demo-nav__reason">{reason}</span>}
        {!isLast && (
          <button type="button" className="primary" onClick={() => dispatch({ type: "next" })} disabled={!canAdvance(state)}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
