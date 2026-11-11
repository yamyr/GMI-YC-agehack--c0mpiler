/**
 * External service interfaces — see specs/001-demo-walkthrough/contracts/services.md.
 * The demo ships scripted implementations only; real Stripe and Google Meet /
 * Zoom adapters must implement these interfaces.
 */

export interface PaymentHold {
  readonly status: "none" | "held" | "released";
  /** Whole USD. */
  readonly amount: number;
  readonly demo: boolean;
}

export interface PaymentService {
  hold(amount: number): PaymentHold;
  release(hold: PaymentHold): PaymentHold;
}

export interface MeetingLink {
  readonly url: string;
  readonly provider: "Google Meet" | "Zoom";
  readonly isDemo: boolean;
}

export interface MeetingService {
  createLink(sessionId: string): MeetingLink;
}

export interface DemoServices {
  readonly payments: PaymentService;
  readonly meetings: MeetingService;
}
