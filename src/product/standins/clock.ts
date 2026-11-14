import { type KeyValue, readJson, writeJson } from "./kv";

export const CLOCK_KEY = "agely.product.clock.v1";

/**
 * The try-out clock (research R11): the real time plus an offset the person sets. It stands in
 * for waiting, so someone trying Agely can see what happens after a session without waiting for
 * one. It only moves forward, and is labelled as a stand-in control wherever it appears.
 */
export interface TryOutClock {
  now(): Date;
  offsetMinutes(): number;
  advance(minutes: number): void;
  reset(): void;
}

export function tryOutClock(kv: KeyValue, realNow: () => number): TryOutClock {
  const read = (): number => {
    const stored = readJson<{ offsetMinutes?: unknown }>(kv, CLOCK_KEY, {}).offsetMinutes;
    return typeof stored === "number" && Number.isFinite(stored) && stored > 0 ? stored : 0;
  };
  return {
    now: () => new Date(realNow() + read() * 60_000),
    offsetMinutes: read,
    advance(minutes) {
      if (Number.isFinite(minutes) && minutes > 0) writeJson(kv, CLOCK_KEY, { offsetMinutes: read() + minutes });
    },
    reset() {
      kv.removeItem(CLOCK_KEY);
    },
  };
}
