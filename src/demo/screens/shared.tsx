import type { Dispatch } from "react";
import type { ConversationId, Notice } from "../domain/types";
import { wasLive } from "../state/reducer";
import type { DemoAction, DemoState } from "../state/reducer";

export interface ScreenProps {
  readonly state: DemoState;
  readonly dispatch: Dispatch<DemoAction>;
}

/** Errors are announced assertively, info politely; always in words. */
export function NoticeLine({ notice }: { readonly notice: Notice | null }) {
  if (notice === null) return null;
  return (
    <p className={`notice notice--${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}

/** FR-013: after a live conversation, say plainly that the draft shown is still the scripted one. */
export function ScriptedDraftNote({ state, after }: { readonly state: DemoState; readonly after: ConversationId }) {
  if (!wasLive(state, after)) return null;
  return (
    <p className="notice notice--info">
      This is the scripted draft. Drafting it from the live conversation comes later.
    </p>
  );
}

/** Parses a whole-dollar text field; blank or non-numeric becomes NaN so validation explains it. */
export function parseDollars(text: string): number {
  const trimmed = text.trim().replace(/^\$/, "");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}
