import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DemoChrome } from "./chrome/DemoChrome";
import "./demo.css";
import { getAgentStatus } from "./live/client";
import { LiveAgentContext, type LiveAgentControls } from "./live/context";
import { CHECKING_STATUS, type AgentStatus } from "./live/types";
import { useLiveRunner } from "./live/useLiveRunner";
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

  // Spec 002: readiness runs in the background and never blocks the start screen (FR-001, FR-002).
  const [status, setStatus] = useState<AgentStatus>(CHECKING_STATUS);
  const [on, setOn] = useState(true);
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return; // StrictMode runs effects twice in development.
    checked.current = true;
    void getAgentStatus(false).then(setStatus);
  }, []);
  const recheck = useCallback(() => {
    setStatus(CHECKING_STATUS);
    void getAgentStatus(true).then(setStatus);
  }, []);
  useEffect(() => {
    dispatch({ type: "setLiveEnabled", enabled: status.state === "ready" && on });
  }, [status.state, on]);
  useLiveRunner(state, dispatch);
  const controls = useMemo<LiveAgentControls>(() => ({ status, on, setOn, recheck }), [status, on, recheck]);
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
    <LiveAgentContext.Provider value={controls}>
    <DemoChrome state={state} dispatch={dispatch}>
      <div ref={stageRef}>
        {/* Keyed by step and restart-sensitive fields so typed drafts reset with the story. */}
        <Screen key={`${state.step}`} id={id} state={state} dispatch={dispatch} />
      </div>
    </DemoChrome>
    </LiveAgentContext.Provider>
  );
}
