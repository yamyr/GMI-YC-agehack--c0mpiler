import { type Dispatch, type FormEvent, useState } from "react";
import { Transcript } from "../chrome/Conversation";
import type { ConversationId, ConversationTurn } from "../domain/types";
import type { DemoAction } from "../state/reducer";
import { BRIEFS } from "./briefs";
import { canFinish } from "./state";
import type { LiveConversation as LiveConversationState } from "./types";

interface Props {
  readonly id: ConversationId;
  readonly conversation: LiveConversationState;
  readonly agentName: string;
  readonly dispatch: Dispatch<DemoAction>;
}

/** FR-008–FR-015: a live conversation with three suggested replies, a typed alternative and fallbacks. */
export function LiveConversation({ id, conversation, agentName, dispatch }: Props) {
  const [draft, setDraft] = useState("");
  const person = BRIEFS[id].replyAs;
  const personKey = person === "Dev" ? "dev" : "margaret";
  const turns: ConversationTurn[] = conversation.lines.map((l) => ({
    speaker: l.speaker === "agent" ? "agent" : personKey,
    text: l.text,
  }));
  const thinking = conversation.pending !== null;
  const canReply = !thinking && !conversation.ended && conversation.error === null && conversation.lines.length > 0;

  const send = (text: string) => {
    if (text.trim() === "") return;
    dispatch({ type: "liveReply", conversation: id, text });
    setDraft("");
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <div>
      <p>
        <span className="badge badge--live">Live agent (Codex)</span>
      </p>
      <Transcript turns={turns} agentName={agentName} />

      {thinking && (
        <p className="thinking" role="status">
          The agent is thinking…
        </p>
      )}

      {conversation.error !== null && (
        <div className="notice notice--error" role="alert">
          <p style={{ margin: 0 }}>{conversation.error}</p>
          <div className="actions" style={{ marginTop: "var(--space-3)" }}>
            <button type="button" className="secondary" onClick={() => dispatch({ type: "liveRequest", conversation: id })}>
              Try again
            </button>
            <button type="button" className="quiet" onClick={() => dispatch({ type: "liveUseScripted", conversation: id })}>
              Use the scripted conversation
            </button>
          </div>
        </div>
      )}

      {canReply && conversation.options.length > 0 && (
        <div className="replies" role="group" aria-label={`${person} can say`}>
          {conversation.options.map((option) => (
            <button key={option} type="button" onClick={() => send(option)}>
              “{option}”
            </button>
          ))}
        </div>
      )}

      {!conversation.ended && (
        <form className="field-row" style={{ marginTop: "var(--space-4)" }} onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor={`live-reply-${id}`}>Or type {person}'s reply</label>
            <input
              id={`live-reply-${id}`}
              type="text"
              value={draft}
              disabled={!canReply}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <button type="submit" className="secondary" disabled={!canReply || draft.trim() === ""}>
            Send
          </button>
        </form>
      )}

      <div className="actions">
        {canFinish(conversation) && (
          <button type="button" className="quiet" onClick={() => dispatch({ type: "liveFinish", conversation: id })}>
            Finish conversation
          </button>
        )}
        {conversation.ended && (
          <p className="notice notice--info" role="status" style={{ margin: 0 }}>
            Conversation finished.
          </p>
        )}
      </div>
    </div>
  );
}
