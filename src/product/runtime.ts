import type { Ports } from "./ports";
import { makeStandInAgent } from "./standins/agent";
import { makeStandInAuth, randomCode } from "./standins/auth";
import { tryOutClock } from "./standins/clock";
import { makeStandInMeetings } from "./standins/meetings";
import { makeStandInPayments } from "./standins/payments";
import { makeStandInStore } from "./standins/store";
import type { Context } from "./usecases/context";

/**
 * The context the product runs with in a browser. In this version every port is a stand-in over
 * the browser's own storage. A real adapter replaces one line here once it passes the port's
 * contract suite.
 */
export function browserContext(): Context | null {
  let kv: Storage;
  try {
    kv = window.localStorage;
    // Access may succeed even when a browser blocks writes.
    const probe = `agely.product.storage-test.${crypto.randomUUID()}`;
    kv.setItem(probe, "");
    try {
      if (kv.getItem(probe) !== "") return null;
    } finally {
      kv.removeItem(probe);
    }
  } catch {
    return null;
  }
  const clock = tryOutClock(kv, () => Date.now());
  const now = (): Date => clock.now();
  const newId = (): string => crypto.randomUUID();
  const ports: Ports = {
    auth: makeStandInAuth({ kv, now, newCode: randomCode, newId }),
    store: makeStandInStore(kv),
    agent: makeStandInAgent(),
    payments: makeStandInPayments(kv),
    meetings: makeStandInMeetings(),
  };
  return { ports, now, newId, clock };
}
