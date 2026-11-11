import type { DemoServices, MeetingService, PaymentHold, PaymentService } from "./types";

/** Offline, deterministic, always labelled as a demo. Moves no money. */
export const scriptedPayments: PaymentService = {
  hold(amount: number): PaymentHold {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error(`cannot hold ${amount}: amount must be a whole number of dollars ≥ 1`);
    }
    return { status: "held", amount, demo: true };
  },
  release(hold: PaymentHold): PaymentHold {
    if (hold.status !== "held") {
      throw new Error(`cannot release a payment that is ${hold.status}`);
    }
    return { ...hold, status: "released" };
  },
};

/** Links use the reserved example.com domain, so they never reach a real meeting. */
export const scriptedMeetings: MeetingService = {
  createLink(sessionId: string) {
    return {
      url: `https://meet.example.com/agely-demo-${sessionId}`,
      provider: "Google Meet",
      isDemo: true,
    };
  },
};

export const scriptedServices: DemoServices = {
  payments: scriptedPayments,
  meetings: scriptedMeetings,
};
