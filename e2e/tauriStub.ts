import type { Page } from "@playwright/test";

/**
 * Stands in for the Tauri IPC bridge so the real frontend can run in
 * Playwright's Chromium. Add a canned response here for every command the
 * screens under test invoke; unhandled commands fail loudly via
 * `collectProblems`.
 */
interface TauriInternalsStub {
  readonly invoke: (cmd: string) => Promise<unknown>;
  readonly transformCallback: () => number;
  readonly unregisterCallback: () => void;
  readonly convertFileSrc: (filePath: string, protocol?: string) => string;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__: TauriInternalsStub;
  }
}

export const CANNED_RESPONSES: Readonly<Record<string, unknown>> = {
  app_info: { name: "c0mpiler", version: "0.0.0-e2e" },
};

export function collectProblems(page: Page): readonly string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => {
    problems.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().startsWith("tauri stub:")) {
      problems.push(message.text());
    }
  });
  return problems;
}

export async function installTauriStub(page: Page): Promise<void> {
  await page.addInitScript((canned: Readonly<Record<string, unknown>>) => {
    let lastCallbackId = 0;
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd) => {
        if (Object.hasOwn(canned, cmd)) return canned[cmd];
        const message = `tauri stub: unhandled command ${cmd}`;
        console.error(message);
        throw new Error(message);
      },
      transformCallback: () => {
        lastCallbackId += 1;
        return lastCallbackId;
      },
      unregisterCallback: () => undefined,
      convertFileSrc: (filePath, protocol = "asset") =>
        `${protocol}://localhost/${encodeURIComponent(filePath)}`,
    };
  }, CANNED_RESPONSES);
}
