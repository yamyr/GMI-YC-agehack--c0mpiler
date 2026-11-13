# Contract: Ports

Five interfaces in `src/product/ports/`. Every method returns a promise. Every adapter, stand-in
or real, must pass the port's suite in `src/product/ports/contract/`. The suites are functions
that take a factory, for example `authContract(() => makeStandInAuth(memory()))`.

Errors are returned as values of a discriminated type, not thrown, so a screen can show a plain
sentence for each.

## AuthPort

```ts
interface AuthPort {
  requestCode(email: string): Promise<{ ok: true; standInCode?: string } | { ok: false; error: "invalid-email" }>;
  confirmCode(email: string, code: string): Promise<{ ok: true; accountId: string; email: string } | { ok: false; error: "wrong-code" | "expired" | "used" }>;
  current(): Promise<string | null>;       // the signed-in account id
  signOut(): Promise<void>;
  forget(accountId: string): Promise<void>; // planned for story 1 (R17); not built yet
  readonly status: ServiceStatus;
}
```

Behaviour every adapter must show:

- A code confirms once; a second confirm with the same code fails with `used`.
- A code past its expiry fails with `expired`.
- Requesting a new code for an email invalidates the previous one.
- The same email always resolves to the same account id; a new email creates an account.
- Email comparison ignores case and surrounding spaces.
- `current()` is null after `signOut()` and survives creating a new adapter over the same storage.
- Only a stand-in returns `standInCode`.
- A confirmed code reports the email in its normal form (lower case, no surrounding spaces).
- After `forget`, nobody is signed in, and the same email signs in to a new account id.

## StorePort

```ts
interface StorePort {
  get<K extends Kind>(kind: K, id: string): Promise<Entity<K> | null>;
  list<K extends Kind>(kind: K, where?: Partial<Entity<K>>): Promise<Entity<K>[]>;
  put<K extends Kind>(kind: K, entity: Entity<K>): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
  /** Run several reads and writes so that either all of the writes happen or none do. */
  transaction<T>(work: (tx: StorePort) => Promise<T>): Promise<T>;
  readonly status: ServiceStatus;
}
```

`Kind` is one of `account`, `profile`, `brief`, `match`, `proposal`, `session`, `payment`.

Behaviour:

- `put` then `get` returns an equal value; `put` with an existing id replaces it.
- `list` with `where` returns only entities whose listed fields are equal.
- Returned values are copies: changing one does not change what is stored.
- A `transaction` whose work rejects leaves the store as it was.
- Data written through one adapter instance is read by a new instance over the same storage.
- The store does not check permissions. That is the use cases' job (see `use-cases.md`).

## AgentPort

```ts
interface AgentPort {
  interviewQuestions(): Promise<AgentQuestion[]>;                    // each with suggested replies
  draftProfile(answers: readonly InterviewAnswer[], locale?: Locale): Promise<ProfileDraft>;   // skills carry their source turn
  suggestPrice(profile: ProfileDraft, locale?: Locale): Promise<PriceSuggestion>;     // a range and at least two reasons
  briefQuestions(): Promise<AgentQuestion[]>;
  draftBrief(answers: readonly InterviewAnswer[], locale?: Locale): Promise<BriefDraft>;
  readonly status: ServiceStatus;
}
```

Behaviour:

- A draft never has a published or confirmed state.
- `draftProfile` returns 1 to 5 skills, every tag from the catalogue and used once, every
  `sourceTurn` pointing at an answer that exists.
- `suggestPrice` returns a valid range and at least two reasons.
- `draftBrief` returns a catalogue skill tag, 1 to 8 units and a valid budget. If a supplied
  budget does not give two whole USD amounts, it returns `budget: null`. The buyer can correct
  that answer before a draft is saved.
- With answers that match nothing in the catalogue, the draft has `unmatched: true` and no
  skills (a brief draft has `skillTag: null`) instead of inventing one. The screen then asks the
  person to say more; it never publishes or confirms an unmatched draft.

## PaymentsPort

```ts
interface PaymentsPort {
  hold(key: string, amountCents: number): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; error: "declined" | "unavailable" | "amount-mismatch" | "invalid-amount" }>;
  release(key: string): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; error: "not-held" }>;
  lift(key: string): Promise<{ ok: true; payment: PaymentRecord } | { ok: false; error: "not-held" }>;
  readonly status: ServiceStatus;
}
```

Behaviour:

- `hold` twice with the same key returns the same held payment and holds once.
- `hold` with the same key and a different amount fails with `amount-mismatch`; it never changes
  the held amount.
- `hold` on a key that was already released or lifted returns that settled payment and holds
  nothing new.
- A `PaymentRecord` is `{ key, amountCents, state, standIn }`. The fee and the amount owed are
  not the provider's business; they are computed in `src/product/model/money.ts` and stored on
  the `Payment` entity.
- `release` and `lift` succeed only from `held`, and each is safe to repeat.
- A released payment cannot be lifted, and the reverse.
- Amounts must be positive integers.
- The stand-in can be told to decline, so the failure path (FR-015) is testable.

## MeetingsPort

```ts
interface MeetingsPort {
  createLink(sessionId: string, startsAt: string, endsAt: string): Promise<MeetingLink>;
  readonly status: ServiceStatus;
}
```

Behaviour:

- The same session id always returns the same link.
- A stand-in link has `standIn: true` and a URL under a reserved example domain.

## ServiceStatus

```ts
interface ServiceStatus {
  readonly service: "sign-in" | "storage" | "agent" | "payments" | "meetings";
  readonly connected: boolean;     // false for every stand-in
  readonly label: string;          // the sentence shown on screen, from copy.ts
}
```

A screen that calls a use case touching a port whose `connected` is false must render that port's
label (FR-022). `e2e/product-honesty.spec.ts` checks every such screen.

## Status of the ports (2026-11-14)

All five interfaces, their contract suites and their stand-ins exist in `src/product/` and pass
(`src/product/standins/standins.test.ts`). The only planned change is `AuthPort.forget` (R17),
added with its contract tests in story 1.
