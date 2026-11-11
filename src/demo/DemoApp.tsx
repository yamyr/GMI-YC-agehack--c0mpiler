import { useEffect, useReducer, useRef } from "react";
import { DemoChrome } from "./chrome/DemoChrome";
import "./demo.css";
import { AcceptScreen } from "./screens/AcceptScreen";
import { BriefScreen } from "./screens/BriefScreen";
import { EngineScreen } from "./screens/EngineScreen";
import { InterviewScreen } from "./screens/InterviewScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { PriceScreen } from "./screens/PriceScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ProposalScreen } from "./screens/ProposalScreen";
import { SessionScreen } from "./screens/SessionScreen";
import type { ScreenProps } from "./screens/shared";
import { StartScreen } from "./screens/StartScreen";
import { WorkflowScreen } from "./screens/WorkflowScreen";
import { scriptedServices } from "./services/scripted";
import { createReducer, initialState, stepInfo } from "./state/reducer";
import type { StepId } from "./state/steps";

const reducer = createReducer(scriptedServices);

function Screen({ id, ...props }: ScreenProps & { readonly id: StepId }) {
  switch (id) {
    case "start":
      return <StartScreen {...props} />;
    case "interview":
      return <InterviewScreen {...props} id="interview" />;
    case "profile":
      return <ProfileScreen {...props} />;
    case "price":
      return <PriceScreen {...props} />;
    case "briefChat":
      return <InterviewScreen {...props} id="brief" />;
    case "brief":
      return <BriefScreen {...props} />;
    case "match":
      return <MatchScreen {...props} />;
    case "proposal":
      return <ProposalScreen {...props} />;
    case "accept":
      return <AcceptScreen {...props} />;
    case "session":
      return <SessionScreen {...props} />;
    case "debrief":
      return <InterviewScreen {...props} id="debrief" />;
    case "workflow":
      return <WorkflowScreen {...props} />;
    case "engine":
      return <EngineScreen {...props} />;
  }
}

/** Presenter-driven walkthrough (spec 001). Offline; all data scripted. */
export function DemoApp() {
  const [state, dispatch] = useReducer(reducer, new Date(), initialState);
  const id = stepInfo(state).id;
  const stageRef = useRef<HTMLDivElement>(null);

  // Move focus to the new step's heading so keyboard and screen-reader users follow the story.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stageRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [state.step]);

  return (
    <DemoChrome state={state} dispatch={dispatch}>
      <div ref={stageRef}>
        {/* Keyed by step and restart-sensitive fields so typed drafts reset with the story. */}
        <Screen key={`${state.step}`} id={id} state={state} dispatch={dispatch} />
      </div>
    </DemoChrome>
  );
}
