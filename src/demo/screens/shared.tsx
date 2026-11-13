import { useI18n } from "../../i18n";
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
  const { t } = useI18n();

  if (!wasLive(state, after)) return null;
  return (
    <p className="notice notice--info">{t("This is the scripted draft. Drafting it from the live conversation comes later.")}</p>
  );
}

/** Ungrouped whole USD only: ambiguous locale separators are rejected, never reinterpreted. */
export function parseDollars(text: string): number {
  // Hindi and Tamil decimal digits keep their numeric value; grouping remains disallowed.
  const normalized = text.normalize("NFKC").replace(/[\u0966-\u096f\u0be6-\u0bef]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= 0x0be6 ? 0x0be6 : 0x0966));
  });
  const trimmed = normalized.trim().replace(/^\$/, "");
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}
