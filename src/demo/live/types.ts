/** Mirrors src-tauri/src/agent/types.rs — see specs/002-live-codex-agent/data-model.md. */
import type { ConversationId } from "../domain/types";
import type { Locale } from "../../../site/i18n/core.js";

export type AgentStatusState =
  | "checking"
  | "ready"
  | "not_installed"
  | "not_signed_in"
  | "model_unavailable"
  | "unavailable"
  | "error";

export interface AgentStatus {
  readonly state: AgentStatusState;
  readonly model: string | null;
  readonly detail: string;
  readonly fix: string | null;
}

export const CHECKING_STATUS: AgentStatus = {
  state: "checking",
  model: null,
  detail: "Checking whether the live agent can run on this computer…",
  fix: null,
};

export interface AgentBrief {
  /** Omission preserves English for older callers; native IPC validates canonical IDs. */
  readonly locale?: Locale;
  readonly conversation: ConversationId;
  readonly agentRole: string;
  readonly goal: string;
  readonly background: string;
  readonly replyAs: "Margaret" | "Dev";
  readonly maxTurns: number;
}

export interface TranscriptLine {
  readonly speaker: "agent" | "person";
  readonly text: string;
}

export interface AgentTurn {
  readonly message: string;
  readonly options: readonly string[];
  readonly done: boolean;
}

export interface AgentErrorPayload {
  readonly code: "not_ready" | "timeout" | "failed" | "malformed";
  readonly message: string;
}

export interface LiveConversation {
  readonly mode: "live" | "scripted";
  readonly lines: readonly TranscriptLine[];
  /** Suggested replies from the latest agent turn. */
  readonly options: readonly string[];
  readonly pending: { readonly requestId: number } | null;
  readonly ended: boolean;
  readonly error: string | null;
}
