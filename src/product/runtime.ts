import type { Ports } from "./ports";
import { makeStandInAgent } from "./standins/agent";
import { makeStandInAuth, randomCode } from "./standins/auth";
import { makeStandInMeetings } from "./standins/meetings";
import { makeStandInPayments } from "./standins/payments";
import { makeStandInStore } from "./standins/store";
import type { Context } from "./usecases/context";

/**
 * The context the product runs with in a browser. In this version every port is a stand-in over
 * the browser's own storage. A real adapter replaces one line here once it passes the port's
 * contract suite.
 */
export function browserContext(): Context {
  const kv = window.localStorage;
  const now = (): Date => new Date();
  const newId = (): string => crypto.randomUUID();
  const ports: Ports = {
    auth: makeStandInAuth({ kv, now, newCode: randomCode, newId }),
    store: makeStandInStore(kv),
    agent: makeStandInAgent(),
    payments: makeStandInPayments(kv),
    meetings: makeStandInMeetings(),
  };
  return { ports, now, newId };
}
