import { invoke } from "@tauri-apps/api/core";

/** Mirrors `AppInfo` in src-tauri/src/lib.rs. */
export interface AppInfo {
  readonly name: string;
  readonly version: string;
}

/**
 * True inside the Tauri webview. False under `bun run dev` in a plain browser,
 * Vitest, or Playwright without the stub — callers must degrade gracefully.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Native build info, or null when not running inside Tauri. */
export async function getAppInfo(): Promise<AppInfo | null> {
  if (!isTauri()) return null;
  return invoke<AppInfo>("app_info");
}
