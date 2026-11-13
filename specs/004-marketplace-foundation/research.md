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

---

The decisions below were added by the plan review of 2026-11-14, after phases 1 and 2 were built.

## R12. Reusing the matching rule for people who are not Margaret

- **Decision**: Keep `matchBrief` as the single matching rule. Widen its input from the
  walkthrough's `Expert` to a smaller `MatchCandidate` shape (id, name, years of experience,
  skills with tags, price range, published) that both `Expert` and a stored profile satisfy, and
  make the function generic so the result carries whichever type went in. `validateProposal`
  takes the other person's name as an argument instead of naming Margaret.
- **Rationale**: FR-010 says the existing rule is the rule. The walkthrough's `Expert` requires an
  age, which the product does not collect, and one message has a fictional person's name in it.
  Widening two signatures is smaller and safer than a second copy of the rule.
- **Alternatives considered**: Filling in a made-up age to satisfy the type is a lie in the data.
  Copying the rule into `src/product/` lets the two drift.

## R13. No age, and where the name comes from

- **Decision**: The product does not ask for or store a person's age. The interview's first
  question becomes "What should people call you?", and its answer is the account's name.
- **Rationale**: Age is personal data the matching rule does not use. The headline metric
  (dollars earned by people over 65) will need it eventually, but collecting it belongs with real
  storage and a privacy notice, not with a stand-in that says nothing is private.
- **Alternatives considered**: Asking for a year of birth now would store sensitive data in a
  browser with no protection.

## R14. Order of work with internationalization (pull request #20)

- **Decision**: Stories 1 to 5 are built after #20 is merged and this branch is rebased on it.
  New screens use that feature's `t("English sentence", ...)` call from the first line, and
  `src/product/copy.ts` becomes a list of registered source sentences.
- **Rationale**: #20 changes `src/App.tsx`, `src/main.tsx` and four of the domain files this
  feature must also change (R12), and adds a `locale` argument to them. Building the screens
  first would mean rewriting every string and resolving the same conflicts twice.
- **Open point for the owner**: #20's checks expect every source sentence to have a draft in each
  language. If that applies to `src/product/`, each new screen needs about 18 draft translations
  of every sentence. Recommended: the product's sentences are registered but exempt from the
  completeness check until story 5, then translated in one pass. This needs the owner's yes,
  because it leaves the product English-only for a while inside an app that offers other
  languages.
- **Alternatives considered**: Merging this branch first forces #20 to absorb the conflicts and
  translate a moving target.

## R15. Moving between product screens

- **Decision**: A small hash router in `src/product/routes.ts`: a table of route patterns, the
  role each needs, and the screen to render. `ProductApp` reads `location.hash`, checks the
  signed-in account against the table, and redirects to the role's home when a route is not
  allowed. The shell's current single-component state machine is split into the screens the
  contract lists.
- **Rationale**: The contract in `use-cases.md` promises addressable routes (a session has an
  address both people can open), and the access rule in FR-004 must hold for a pasted address.
  The shell built in phase 2 has no addresses below `#/app`.
- **Alternatives considered**: A router library is a dependency for a dozen routes. Keeping one
  state machine cannot give a session its own address.

## R16. Choosing a time for a session

- **Decision**: The buyer picks from a short list of suggested times (the next three weekdays at
  10:00 and 14:00 in their own time zone) or uses the browser's own date and time control.
  Tests pin the browser's time zone and the product clock.
- **Rationale**: Proposing is the buyer's step, so a control is acceptable under principle I,
  and suggested times keep it to one tap. The native control is accessible and needs no library.
- **Alternatives considered**: A calendar widget is a dependency and an accessibility risk.
  Reading the expert's availability needs a calendar connection, which is out of scope.

## R17. Forgetting an account

- **Decision**: `AuthPort` gains `forget(accountId)`, which signs the person out and removes the
  link between their email and their account id. `deleteAccount` calls it after removing the
  stored data.
- **Rationale**: FR-003. Without it, deleting an account leaves the email-to-account link in the
  sign-in stand-in, so signing in again would quietly return to the "deleted" id.
- **Alternatives considered**: Leaving the link and treating a missing account record as new
  works by accident and would not survive a real sign-in service.

## R18. What the stand-ins cannot show

- **Decision**: State three limits on screen and in the quickstart, and do not work around them:
  two browser tabs writing at once can overwrite each other; a proposal reaches the expert only
  when they next open their inbox, because nothing sends a message; and anyone can sign in as
  any address on the same device.
- **Rationale**: Principle III. Each limit disappears with a real service, and pretending
  otherwise in the stand-in would hide exactly what the real adapters must provide.
- **Alternatives considered**: Cross-tab locking and fake notifications are code that the real
  adapters would throw away.
