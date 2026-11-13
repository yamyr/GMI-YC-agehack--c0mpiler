import { STAND_IN_LABELS } from "../copy";
import type { PaymentRecord, PaymentsPort, SettleResult } from "../ports";
import { type KeyValue, readJson, writeJson } from "./kv";

export const PAYMENTS_KEY = "agely.product.payments.v1";

export interface StandInPayments extends PaymentsPort {
  /** Make the next hold fail the way a declined card would, so that path can be tried. */
  declineNext(): void;
}

/**
 * Stand-in payments: records holds, releases and lifts, and moves no money. Keyed the way a real
 * provider's idempotency key works, so the real adapter maps onto it (research R8).
 */
export function makeStandInPayments(kv: KeyValue): StandInPayments {
  const read = (): Record<string, PaymentRecord> => readJson(kv, PAYMENTS_KEY, {});
  let decline = false;

  const settle = (key: string, to: "released" | "lifted"): SettleResult => {
    const all = read();
    const found = all[key];
    if (found === undefined) return { ok: false, error: "not-held" };
    if (found.state === to) return { ok: true, payment: found };
    if (found.state !== "held") return { ok: false, error: "not-held" };
    const payment: PaymentRecord = { ...found, state: to };
    writeJson(kv, PAYMENTS_KEY, { ...all, [key]: payment });
    return { ok: true, payment };
  };

  return {
    status: { service: "payments", connected: false, label: STAND_IN_LABELS.payments },

    declineNext() {
      decline = true;
    },

    async hold(key, amountCents) {
      if (!Number.isInteger(amountCents) || amountCents < 1) return { ok: false, error: "invalid-amount" };
      const all = read();
      const existing = all[key];
      if (existing !== undefined) {
        return existing.amountCents === amountCents ? { ok: true, payment: existing } : { ok: false, error: "amount-mismatch" };
      }
      if (decline) {
        decline = false;
        return { ok: false, error: "declined" };
      }
      const payment: PaymentRecord = { key, amountCents, state: "held", standIn: true };
      writeJson(kv, PAYMENTS_KEY, { ...all, [key]: payment });
      return { ok: true, payment };
    },

    async release(key) {
      return settle(key, "released");
    },

    async lift(key) {
      return settle(key, "lifted");
    },
  };
}
