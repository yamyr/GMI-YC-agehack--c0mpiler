/** Pure transitions for one live conversation (data-model.md › LiveConversation). */
import type { AgentTurn, LiveConversation } from "./types";

export function emptyLive(mode: LiveConversation["mode"]): LiveConversation {
  return { mode, lines: [], options: [], pending: null, ended: false, error: null };
}

export function requestTurn(c: LiveConversation, requestId: number): LiveConversation {
  return { ...c, pending: { requestId }, error: null };
}

function isCurrent(c: LiveConversation, requestId: number): boolean {
  return c.pending?.requestId === requestId;
}

/** FR-016: a response for any request other than the pending one is ignored. */
export function receiveTurn(c: LiveConversation, requestId: number, turn: AgentTurn): LiveConversation {
  if (!isCurrent(c, requestId)) return c;
  return {
    ...c,
    lines: [...c.lines, { speaker: "agent", text: turn.message }],
    options: turn.options,
    pending: null,
    ended: turn.done,
    error: null,
  };
}

export function failTurn(c: LiveConversation, requestId: number, message: string): LiveConversation {
  if (!isCurrent(c, requestId)) return c;
  return { ...c, pending: null, error: message };
}

/** FR-010: null when the reply can't be sent (empty, waiting, or already ended). */
export function reply(c: LiveConversation, text: string, requestId: number): LiveConversation | null {
  const trimmed = text.trim();
  if (trimmed === "" || c.pending !== null || c.ended) return null;
  return {
    ...c,
    lines: [...c.lines, { speaker: "person", text: trimmed }],
    options: [],
    pending: { requestId },
    error: null,
  };
}

/** FR-012: the presenter may finish after at least one reply, when nothing is pending. */
export function canFinish(c: LiveConversation): boolean {
  return !c.ended && c.pending === null && c.lines.some((l) => l.speaker === "person");
}

export function finish(c: LiveConversation): LiveConversation {
  return canFinish(c) ? { ...c, ended: true, options: [] } : c;
}

export function useScripted(c: LiveConversation): LiveConversation {
  return { ...c, mode: "scripted", pending: null, error: null };
}
