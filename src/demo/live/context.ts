import { createContext, useContext } from "react";
import { CHECKING_STATUS, type AgentStatus } from "./types";

export interface LiveAgentControls {
  readonly status: AgentStatus;
  /** Presenter switch (FR-004); only meaningful when the status is ready. */
  readonly on: boolean;
  readonly setOn: (on: boolean) => void;
  readonly recheck: () => void;
}

export const LiveAgentContext = createContext<LiveAgentControls>({
  status: CHECKING_STATUS,
  on: true,
  setOn: () => undefined,
  recheck: () => undefined,
});

export function useLiveAgent(): LiveAgentControls {
  return useContext(LiveAgentContext);
}
