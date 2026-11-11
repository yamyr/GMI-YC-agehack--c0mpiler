import type { Page } from "@playwright/test";

/**
 * Stands in for the Tauri IPC bridge so the real frontend can run in
 * Playwright's Chromium. Add a canned response here for every command the
 * screens under test invoke; unhandled commands fail loudly via
 * `collectProblems`.
 *
 * A canned value may be a `{ __sequence: [...] }`: each call takes the next
 * entry (the last one repeats). An entry `{ __error: {...} }` makes that call
 * reject with the given payload.
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
    __tauriCalls: string[];
  }
}

export const NOT_INSTALLED = {
  state: "not_installed",
  model: null,
  detail: "Codex is not installed on this computer, so the scripted conversations are used.",
  fix: "Install it with: npm install -g @openai/codex — then select Check again.",
};

export const READY = {
  state: "ready",
  model: "test-model",
  detail: "Live agent ready, using test-model through your Codex sign-in.",
  fix: null,
};

export const CANNED_RESPONSES: Readonly<Record<string, unknown>> = {
  app_info: { name: "Agely", version: "0.0.0-e2e" },
  agent_status: NOT_INSTALLED,
  agent_turn: { message: "Hello from the stub agent.", options: ["One", "Two", "Three"], done: false },
};

export function sequence(...entries: readonly unknown[]): unknown {
  return { __sequence: entries };
}

export function failure(code: string, message: string): unknown {
  return { __error: { code, message } };
}

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

export async function installTauriStub(page: Page, overrides: Readonly<Record<string, unknown>> = {}): Promise<void> {
  await page.addInitScript((canned: Readonly<Record<string, unknown>>) => {
    let lastCallbackId = 0;
    const cursors: Record<string, number> = {};
    window.__tauriCalls = [];
    const next = (cmd: string): unknown => {
      const value = canned[cmd];
      if (value !== null && typeof value === "object" && "__sequence" in value) {
        const entries = (value as { __sequence: unknown[] }).__sequence;
        const index = Math.min(cursors[cmd] ?? 0, entries.length - 1);
        cursors[cmd] = index + 1;
        return entries[index];
      }
      return value;
    };
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd) => {
        window.__tauriCalls.push(cmd);
        if (!Object.hasOwn(canned, cmd)) {
          const message = `tauri stub: unhandled command ${cmd}`;
          console.error(message);
          throw new Error(message);
        }
        const value = next(cmd);
        if (value !== null && typeof value === "object" && "__error" in value) {
          throw (value as { __error: unknown }).__error;
        }
        return value;
      },
      transformCallback: () => {
        lastCallbackId += 1;
        return lastCallbackId;
      },
      unregisterCallback: () => undefined,
      convertFileSrc: (filePath, protocol = "asset") =>
        `${protocol}://localhost/${encodeURIComponent(filePath)}`,
    };
  }, { ...CANNED_RESPONSES, ...overrides });
}
