// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { getAppInfo, isTauri } = await import("./native");

afterEach(() => {
  invoke.mockReset();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("native bridge", () => {
  it("reports a plain browser as not Tauri and skips IPC", async () => {
    expect(isTauri()).toBe(false);
    await expect(getAppInfo()).resolves.toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("invokes app_info inside Tauri", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    invoke.mockResolvedValue({ name: "Agely", version: "0.1.0" });
    await expect(getAppInfo()).resolves.toEqual({ name: "Agely", version: "0.1.0" });
    expect(invoke).toHaveBeenCalledWith("app_info");
  });
});
