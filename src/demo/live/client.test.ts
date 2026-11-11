// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { BRIEFS } from "./briefs";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { getAgentStatus, runAgentTurn } = await import("./client");

afterEach(() => {
  invoke.mockReset();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("live agent client", () => {
  it("reports the browser preview as unavailable without calling Rust", async () => {
    await expect(getAgentStatus(false)).resolves.toMatchObject({ state: "unavailable" });
    await expect(runAgentTurn(BRIEFS.interview, [])).rejects.toMatchObject({ code: "not_ready" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("asks Rust for the status, passing recheck", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invoke.mockResolvedValue({ state: "ready", model: "m", detail: "ok", fix: null });
    await expect(getAgentStatus(true)).resolves.toMatchObject({ state: "ready", model: "m" });
    expect(invoke).toHaveBeenCalledWith("agent_status", { recheck: true });
  });

  it("turns a failed status call into an error status", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invoke.mockRejectedValue(new Error("ipc down"));
    await expect(getAgentStatus(false)).resolves.toMatchObject({ state: "error", detail: expect.stringContaining("ipc down") });
  });

  it("sends the brief and transcript for a turn", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const turn = { message: "Hi", options: ["a", "b", "c"], done: false };
    invoke.mockResolvedValue(turn);
    const transcript = [{ speaker: "agent" as const, text: "Hello" }];
    await expect(runAgentTurn(BRIEFS.brief, transcript)).resolves.toEqual(turn);
    expect(invoke).toHaveBeenCalledWith("agent_turn", { request: { brief: BRIEFS.brief, transcript } });
  });
});
