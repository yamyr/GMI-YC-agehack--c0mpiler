import { describe, expect, it } from "vitest";
import type { PaymentsPort } from "../index";

export interface PaymentsHarness {
  readonly payments: PaymentsPort;
  reopen(): PaymentsPort;
  /** Make the next hold fail the way a declined card would. */
  declineNext(): void;
}

/** Behaviour every PaymentsPort adapter must show. */
export function paymentsContract(name: string, make: () => PaymentsHarness): void {
  describe(`PaymentsPort contract: ${name}`, () => {
    it("holds an amount", async () => {
      const { payments } = make();
      const result = await payments.hold("p1", 15_000);
      expect(result).toMatchObject({ ok: true, payment: { key: "p1", amountCents: 15_000, state: "held" } });
    });

    it("holds once however many times the same key is submitted", async () => {
      const h = make();
      const [a, b, c] = await Promise.all([h.payments.hold("p1", 15_000), h.payments.hold("p1", 15_000), h.payments.hold("p1", 15_000)]);
      expect(a).toEqual(b);
      expect(b).toEqual(c);
      expect(await h.reopen().hold("p1", 15_000)).toEqual(a);
    });

    it("never changes a held amount", async () => {
      const { payments } = make();
      await payments.hold("p1", 15_000);
      expect(await payments.hold("p1", 20_000)).toEqual({ ok: false, error: "amount-mismatch" });
      expect(await payments.hold("p1", 15_000)).toMatchObject({ ok: true, payment: { amountCents: 15_000 } });
    });

    it("refuses amounts that are not positive whole cents", async () => {
      const { payments } = make();
      for (const amount of [0, -100, 10.5, Number.NaN]) {
        expect(await payments.hold(`bad-${amount}`, amount)).toEqual({ ok: false, error: "invalid-amount" });
      }
    });

    it("holds nothing when the payment is declined, and can be tried again", async () => {
      const h = make();
      h.declineNext();
      expect(await h.payments.hold("p1", 15_000)).toEqual({ ok: false, error: "declined" });
      expect(await h.payments.release("p1")).toEqual({ ok: false, error: "not-held" });
      expect((await h.payments.hold("p1", 15_000)).ok).toBe(true);
    });

    it("releases a held payment, and repeating the release changes nothing", async () => {
      const { payments } = make();
      await payments.hold("p1", 15_000);
      const first = await payments.release("p1");
      expect(first).toMatchObject({ ok: true, payment: { state: "released", amountCents: 15_000 } });
      expect(await payments.release("p1")).toEqual(first);
    });

    it("lifts a held payment, and repeating the lift changes nothing", async () => {
      const { payments } = make();
      await payments.hold("p1", 15_000);
      const first = await payments.lift("p1");
      expect(first).toMatchObject({ ok: true, payment: { state: "lifted" } });
      expect(await payments.lift("p1")).toEqual(first);
    });

    it("cannot lift what was released, or release what was lifted", async () => {
      const { payments } = make();
      await payments.hold("r", 1_000);
      await payments.release("r");
      expect(await payments.lift("r")).toEqual({ ok: false, error: "not-held" });
      await payments.hold("l", 1_000);
      await payments.lift("l");
      expect(await payments.release("l")).toEqual({ ok: false, error: "not-held" });
    });

    it("cannot settle a payment that was never held", async () => {
      const { payments } = make();
      expect(await payments.release("nothing")).toEqual({ ok: false, error: "not-held" });
      expect(await payments.lift("nothing")).toEqual({ ok: false, error: "not-held" });
    });

    it("does not hold again a key that was already settled", async () => {
      const { payments } = make();
      await payments.hold("p1", 15_000);
      await payments.release("p1");
      expect(await payments.hold("p1", 15_000)).toMatchObject({ ok: true, payment: { state: "released" } });
    });

    it("marks stand-in payments as such", async () => {
      const { payments } = make();
      const result = await payments.hold("p1", 100);
      expect(result.ok && result.payment.standIn).toBe(!payments.status.connected);
      expect(payments.status.service).toBe("payments");
    });
  });
}
