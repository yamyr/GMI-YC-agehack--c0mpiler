# Research: Marketplace Foundation

Each decision resolves a question the spec or the technical context left open.

## R1. Where the product lives

- **Decision**: In the existing web bundle, under `src/product/`, opened with the URL hash
  `#/app`. `site/_redirects` gives it the short address `agely.dev/app`.
- **Rationale**: One build, one deploy, one set of tokens and checks. The walkthrough and the
  product share the matching and pricing rules by import. A hash route needs no server rewrite
  and works under the `/demo/` base and inside Tauri unchanged.
- **Alternatives considered**: A second Vite entry (`app.html`) doubles the build configuration
  for no user-visible gain. A separate repository splits the rules in two. A router library is a
  new dependency for about a dozen routes.

## R2. Stand-ins behind ports

- **Decision**: Five ports with async methods. Each has one stand-in in `src/product/standins/`
  and one shared contract suite in `src/product/ports/contract/` exported as a function that
  takes an adapter factory.
- **Rationale**: FR-021 and FR-026 require that a real service can replace a stand-in without
  touching screens or rules. A contract suite written once and run against every adapter is the
  proof (SC-010). Async signatures now avoid a rewrite later.
- **Alternatives considered**: Mock Service Worker in front of a pretend HTTP API tests the wrong
  boundary and adds a dependency. Building directly on Supabase's client behind no interface
  would make the stand-in impossible.

## R3. Where the stand-in keeps data

- **Decision**: `localStorage`, one JSON document under `agely.product.v1`, read and written
  through a small key-value interface that tests replace with an in-memory map.
- **Rationale**: Survives closing the tab (FR-008), needs nothing installed, and is honest about
  its limit: one device. The version in the key lets a later shape change discard old data
  deliberately instead of misreading it.
- **Alternatives considered**: IndexedDB is asynchronous and transactional but far more code for
  tens of records. `sessionStorage` does not survive closing the tab.

## R4. Sign-in without a real mailer

- **Decision**: The person gives an email address; the stand-in generates a six-digit code and
  shows it on the next screen in a clearly labelled box ("Stand-in: a real version emails this
  code"). Codes expire after 10 minutes and work once.
- **Rationale**: Exercises the same steps as a real one-time code (request, wait, confirm, expiry,
  reuse) so the screens and tests carry over, while no message is sent and nothing pretends to be.
- **Alternatives considered**: Skipping the code and signing in on any address would leave the
  expiry and reuse cases (spec edge cases) untested. Sending real email needs a service.

## R5. A drafting agent a real person can use

- **Decision**: A fifth port, `AgentPort`, with a rule-based stand-in. It asks a fixed set of
  questions, offers suggested replies, and builds a draft by matching the person's words against
  a skill catalogue. The draft records which answer each skill came from.
- **Rationale**: Margaret's scripted answers cannot produce Ruth's profile. Principle I requires
  conversation, not a form, and principle III requires the stand-in to be labelled as one. The
  optional live Codex agent runs only in the desktop app, so the website needs its own stand-in.
- **Alternatives considered**: Reusing the scripted interview would publish a fictional person's
  career under a real account. A form is ruled out by the constitution. Calling a model from the
  browser needs a key and a backend.

## R6. The skill catalogue

- **Decision**: A fixed list of skill tags with labels and keywords in `src/product/model/`,
  starting from the tags the walkthrough already uses. Experts and briefs both draw from it.
- **Rationale**: The matching rule compares tags for equality (FR-010). Without a shared
  vocabulary, a brief and a profile written in free text would never match.
- **Alternatives considered**: Free-text skills with fuzzy matching changes the rule the spec
  says to keep. Embedding search needs a model.

## R7. Permissions

- **Decision**: Every use case takes the acting account as its first argument and refuses, with
  a typed error, anything that account may not do. Screens never call a port directly.
- **Rationale**: FR-004 and SC-005 must hold for any adapter. With real storage, row-level rules
  will enforce the same thing again on the server; the use cases stay as the readable statement
  of the rule and its test.
- **Alternatives considered**: Hiding buttons in the interface is not a permission.

## R8. Holding a payment exactly once

- **Decision**: `PaymentsPort.hold` is keyed by the proposal's id. A second call with the same
  key returns the existing hold. Acceptance is one use case that holds first and confirms the
  session only if the hold succeeded.
- **Rationale**: FR-015 and FR-016. This is the same idempotency-key pattern a real payment
  provider offers, so the real adapter maps onto it directly.
- **Alternatives considered**: Disabling the button after the first press does not survive a
  lost connection or a second tab.

## R9. Money

- **Decision**: Prices per 15 minutes stay whole dollars, as in the walkthrough. Session totals,
  the fee and the amount owed are integer cents. The fee is 10%, rounded half up, defined once.
- **Rationale**: FR-020. A 10% fee on an odd total is not a whole dollar.
- **Alternatives considered**: Floating-point dollars lose cents.

## R10. Time and calendars

- **Decision**: Session times are stored as an instant (ISO 8601, UTC). Each person sees them
  through `Intl.DateTimeFormat` in their browser's time zone. "Add to calendar" downloads an
  `.ics` file generated in the browser. The meeting stand-in returns a placeholder link under a
  reserved example domain, labelled as not a real meeting.
- **Rationale**: FR-017 and the time-zone edge cases, with no date library. An `.ics` file is
  accepted by every calendar and is real even while the meeting link is a stand-in.
- **Alternatives considered**: Calendar provider links (Google, Outlook) differ per provider and
  some need sign-in. Hand-rolled time-zone arithmetic is a known source of bugs.

## R11. Time in tests and try-outs

- **Decision**: Use cases read the time from a `now()` function passed in with the ports. Tests
  pass a fixed clock. The product passes the real clock plus an offset the person can set from
  the account screen ("try-out clock"), labelled as a stand-in control.
- **Rationale**: A session can only be marked held after it ends (story 4). Without a movable
  clock, nobody could try that step without waiting, and tests would depend on the wall clock.
- **Alternatives considered**: Letting a session be marked held at any time removes a rule the
  real product needs.
