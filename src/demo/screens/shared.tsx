import type { Dispatch } from "react";
import type { Notice } from "../domain/types";
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

/** Parses a whole-dollar text field; blank or non-numeric becomes NaN so validation explains it. */
export function parseDollars(text: string): number {
  const trimmed = text.trim().replace(/^\$/, "");
  return trimmed === "" ? Number.NaN : Number(trimmed);
}
