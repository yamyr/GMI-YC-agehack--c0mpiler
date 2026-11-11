import { invoke } from "@tauri-apps/api/core";
import { toMessage } from "../../lib/errors";
import { isTauri } from "../../lib/native";
import type { AgentBrief, AgentErrorPayload, AgentStatus, AgentTurn, TranscriptLine } from "./types";

const BROWSER_PREVIEW: AgentStatus = {
  state: "unavailable",
  model: null,
  detail: "The live agent runs only in the desktop app; this browser preview uses the scripted conversations.",
  fix: "Run bun run tauri dev to use it.",
};

/** FR-001/FR-003. Never rejects: failures come back as an `error` status. */
export async function getAgentStatus(recheck: boolean): Promise<AgentStatus> {
  if (!isTauri()) return BROWSER_PREVIEW;
  try {
    return await invoke<AgentStatus>("agent_status", { recheck });
  } catch (err) {
    return {
      state: "error",
      model: null,
      detail: `The live agent check failed: ${toMessage(err)}`,
      fix: "Select Check again.",
    };
  }
}

/** One live turn; rejects with an AgentErrorPayload-like value. */
export async function runAgentTurn(brief: AgentBrief, transcript: readonly TranscriptLine[]): Promise<AgentTurn> {
  if (!isTauri()) {
    const notReady: AgentErrorPayload = { code: "not_ready", message: "The live agent runs only in the desktop app." };
    throw notReady;
  }
  return invoke<AgentTurn>("agent_turn", { request: { brief, transcript } });
}
