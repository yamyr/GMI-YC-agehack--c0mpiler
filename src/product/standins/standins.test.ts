import { agentContract } from "../ports/contract/agent";
import { authContract } from "../ports/contract/auth";
import { meetingsContract } from "../ports/contract/meetings";
import { paymentsContract } from "../ports/contract/payments";
import { storeContract } from "../ports/contract/store";
import { makeStandInAgent } from "./agent";
import { AUTH_KEY, makeStandInAuth } from "./auth";
import { type KeyValue, memory } from "./kv";
import { makeStandInMeetings } from "./meetings";
import { makeStandInPayments } from "./payments";
import { makeStandInStore } from "./store";

// Each stand-in is run through the same suite a real adapter will have to pass (SC-010).

let storeKv: KeyValue = memory();
storeContract(
  "stand-in",
  () => makeStandInStore((storeKv = memory())),
  () => makeStandInStore(storeKv),
);

authContract("stand-in", () => {
  const kv = memory();
  let time = new Date("2026-11-14T12:00:00.000Z").getTime();
  let counter = 0;
  const make = () => makeStandInAuth({ kv, now: () => new Date(time), newCode: () => String(100_000 + ++counter), newId: () => `acct-${++counter}` });
  return {
    auth: make(),
    reopen: make,
    advance: (minutes) => void (time += minutes * 60_000),
    codeFor: (email) => (JSON.parse(kv.getItem(AUTH_KEY) ?? "{}") as { codes: Record<string, { code: string }> }).codes[email.trim().toLowerCase()]?.code ?? "",
  };
});

paymentsContract("stand-in", () => {
  const kv = memory();
  const payments = makeStandInPayments(kv);
  return { payments, reopen: () => makeStandInPayments(kv), declineNext: () => payments.declineNext() };
});

meetingsContract("stand-in", makeStandInMeetings);
agentContract("stand-in", makeStandInAgent);
