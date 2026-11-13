import { type Dispatch, useEffect, useRef } from "react";
import { useI18n } from "../../i18n";
import { toMessage } from "../../lib/errors";
import type { ConversationId } from "../domain/types";
import { type DemoAction, type DemoState, isLiveActive } from "../state/reducer";
import { STEPS } from "../state/steps";
import { BRIEFS } from "./briefs";
import { runAgentTurn } from "./client";

const IDS: readonly ConversationId[] = ["interview", "brief", "debrief"];

/**
 * Side effects for live conversations: opens a conversation when its step is shown, and runs each
 * pending request exactly once (guarded for StrictMode's double effects). Results are dispatched
 * with their requestId; the reducer drops any that are stale (FR-016).
 */
export function useLiveRunner(state: DemoState, dispatch: Dispatch<DemoAction>): void {
  const { locale } = useI18n();
  const inFlight = useRef(new Set<number>());

  // Open the conversation on the current step.
  const current = STEPS[state.step]?.conversation;
  const opening =
    current !== undefined &&
    isLiveActive(state, current) &&
    state.live.conversations[current].lines.length === 0 &&
    state.live.conversations[current].pending === null &&
    state.live.conversations[current].error === null;
  useEffect(() => {
    if (opening && current !== undefined) dispatch({ type: "liveRequest", conversation: current });
  }, [opening, current, dispatch]);

  // Run pending requests.
  useEffect(() => {
    for (const id of IDS) {
      const c = state.live.conversations[id];
      const requestId = c.pending?.requestId;
      if (requestId === undefined || inFlight.current.has(requestId)) continue;
      inFlight.current.add(requestId);
      runAgentTurn({ ...BRIEFS[id], locale }, c.lines)
        .then((turn) => dispatch({ type: "liveTurnReceived", conversation: id, requestId, turn }))
        .catch((err: unknown) =>
          dispatch({ type: "liveTurnFailed", conversation: id, requestId, message: toMessage(err) }),
        );
    }
  }, [state.live.conversations, dispatch, locale]);
}
