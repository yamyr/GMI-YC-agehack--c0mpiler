# Contract: External service interfaces

Module: `src/demo/services/types.ts`. The demo ships scripted implementations only
(`src/demo/services/scripted.ts`). Real adapters (Stripe, Google Meet / Zoom) must implement the
same interfaces later.

> The signed-in product (spec 004) does not use these two interfaces. It has its own ports, with
> idempotent holds, releases and lifts, in `src/product/ports/`; see
> `specs/004-marketplace-foundation/contracts/ports.md`. Real Stripe and meeting adapters will
> implement those. This contract still describes the walkthrough.

```ts
interface PaymentHold {
  readonly status: "none" | "held" | "released";
  readonly amount: number;   // integer USD
  readonly demo: boolean;    // scripted implementation always true
}

interface PaymentService {
  hold(amount: number): PaymentHold;          // → status "held"
  release(hold: PaymentHold): PaymentHold;    // held → released; any other status throws
}

interface MeetingLink {
  readonly url: string;
  readonly provider: "Google Meet" | "Zoom";
  readonly isDemo: boolean;  // scripted implementation always true
}

interface MeetingService {
  createLink(sessionId: string): MeetingLink;
}
```

Scripted behaviour:

- No network access, no timers, deterministic output for a given input.
- `createLink("s1")` → `{ url: "https://meet.example.com/agely-demo-s1", provider: "Google Meet", isDemo: true }`
  (`example.com` is reserved and never resolves to a real meeting).
- `hold(amount)` rejects non-positive or non-integer amounts.

Synchronous signatures are acceptable for the demo; a real adapter will wrap them in async
versions when it is introduced (an interface change recorded in a future spec).
