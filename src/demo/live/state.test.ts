import { describe, expect, it } from "vitest";
import { canFinish, emptyLive, failTurn, finish, receiveTurn, reply, requestTurn, useScripted } from "./state";
import type { AgentTurn } from "./types";

const TURN: AgentTurn = { message: "What did you do?", options: ["A", "B", "C"], done: false };

describe("live conversation state", () => {
  it("starts empty in the given mode", () => {
    expect(emptyLive("live")).toEqual({ mode: "live", lines: [], options: [], pending: null, ended: false, error: null });
  });

  it("marks a request as pending and clears any error", () => {
    const failed = { ...emptyLive("live"), error: "boom" };
    expect(requestTurn(failed, 7)).toMatchObject({ pending: { requestId: 7 }, error: null });
  });

  it("appends the agent line and options when the matching response arrives", () => {
    const next = receiveTurn(requestTurn(emptyLive("live"), 1), 1, TURN);
    expect(next.lines).toEqual([{ speaker: "agent", text: "What did you do?" }]);
    expect(next.options).toEqual(["A", "B", "C"]);
    expect(next.pending).toBeNull();
    expect(next.ended).toBe(false);
  });

  it("ends the conversation when the agent says done", () => {
    const next = receiveTurn(requestTurn(emptyLive("live"), 1), 1, { ...TURN, done: true });
    expect(next.ended).toBe(true);
  });

  it("ignores a stale response (FR-016)", () => {
    const pending = requestTurn(emptyLive("live"), 2);
    expect(receiveTurn(pending, 1, TURN)).toBe(pending);
    expect(receiveTurn(emptyLive("live"), 1, TURN)).toEqual(emptyLive("live"));
    expect(failTurn(pending, 1, "late")).toBe(pending);
  });

  it("records a failure and stops waiting", () => {
    const next = failTurn(requestTurn(emptyLive("live"), 3), 3, "Codex timed out");
    expect(next).toMatchObject({ pending: null, error: "Codex timed out" });
  });

  it("sends a non-empty reply and asks for the next turn", () => {
    const afterAgent = receiveTurn(requestTurn(emptyLive("live"), 1), 1, TURN);
    const next = reply(afterAgent, "  I ran procurement.  ", 2);
    expect(next?.lines.at(-1)).toEqual({ speaker: "person", text: "I ran procurement." });
    expect(next?.options).toEqual([]);
    expect(next?.pending).toEqual({ requestId: 2 });
  });

  it("refuses empty replies, replies while waiting, and replies after the end", () => {
    const afterAgent = receiveTurn(requestTurn(emptyLive("live"), 1), 1, TURN);
    expect(reply(afterAgent, "   ", 2)).toBeNull();
    expect(reply(requestTurn(afterAgent, 2), "hi", 3)).toBeNull();
    expect(reply({ ...afterAgent, ended: true }, "hi", 3)).toBeNull();
  });

  it("can be finished only after the person has replied at least once", () => {
    const afterAgent = receiveTurn(requestTurn(emptyLive("live"), 1), 1, TURN);
    expect(canFinish(afterAgent)).toBe(false);
    expect(finish(afterAgent)).toBe(afterAgent);
    const afterReply = receiveTurn(reply(afterAgent, "Yes.", 2) ?? afterAgent, 2, TURN);
    expect(canFinish(afterReply)).toBe(true);
    expect(finish(afterReply).ended).toBe(true);
  });

  it("switches to the scripted conversation and drops pending work", () => {
    const next = useScripted(failTurn(requestTurn(emptyLive("live"), 1), 1, "boom"));
    expect(next).toMatchObject({ mode: "scripted", pending: null, error: null });
  });
});
