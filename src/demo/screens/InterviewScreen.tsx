import { Conversation } from "../chrome/Conversation";
import type { ConversationId } from "../domain/types";
import { LiveConversation } from "../live/LiveConversation";
import { isLiveActive } from "../state/reducer";
import type { ScreenProps } from "./shared";

const COPY: Readonly<Record<ConversationId, { readonly title: string; readonly lead: string; readonly agent: string }>> = {
  interview: {
    title: "Margaret talks to the onboarding agent",
    lead: "No forms. The agent interviews Margaret about her career and reads the documents she offers.",
    agent: "Onboarding agent",
  },
  brief: {
    title: "Dev describes his problem",
    lead: "Dev talks to his buyer's agent, which turns a business problem into a clear brief.",
    agent: "Buyer's agent",
  },
  debrief: {
    title: "The agent debriefs Margaret",
    lead: "The session with Dev has happened. The agent asks Margaret how she thinks, so her engine can learn it.",
    agent: "Agely agent",
  },
};

export function InterviewScreen({ state, dispatch, id }: ScreenProps & { readonly id: ConversationId }) {
  const conversation = state.conversations[id];
  const copy = COPY[id];
  return (
    <div>
      <h2 tabIndex={-1}>{copy.title}</h2>
      <p className="lead">{copy.lead}</p>
      {isLiveActive(state, id) ? (
        <LiveConversation id={id} conversation={state.live.conversations[id]} agentName={copy.agent} dispatch={dispatch} />
      ) : (
        <Conversation
          turns={conversation.turns}
          shown={conversation.shown}
          agentName={copy.agent}
          onNextTurn={() => dispatch({ type: "showNextTurn" })}
        />
      )}
    </div>
  );
}
