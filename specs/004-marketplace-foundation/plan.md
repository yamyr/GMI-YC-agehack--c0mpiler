# Implementation Plan: Marketplace Foundation

**Branch**: `004-marketplace-foundation` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-marketplace-foundation/spec.md`

## Summary

Build the signed-in product beside the scripted walkthrough, in the same web bundle, on stand-ins
only. Five ports (sign-in, storage, drafting agent, payments, meetings) each get an in-browser
stand-in and a shared behaviour test suite that a real adapter must later pass. All rules (who may
see what, when a payment is held, how a match is chosen) live in a use-case layer of pure
functions over those ports, so they are tested once and do not change when Supabase, Stripe or a
meeting provider is connected. No backend, no network call and no new runtime dependency is added
in this version.

## Technical Context

**Language/Version**: TypeScript 7 (strict), React 19

**Primary Dependencies**: none new. Vite 8, Vitest 5, Playwright and axe as today.

**Storage**: the browser's `localStorage`, through `StorePort`, under one versioned key. Real
storage (Supabase) is a later feature.

**Testing**: Vitest for ports (shared contract suites), use cases and domain; Playwright for one
journey per user story plus accessibility and layout over every product screen.

**Target Platform**: evergreen desktop and phone browsers. The same bundle is loaded by the Tauri
desktop app, which does not show the product entry in this version (FR-025).

**Project Type**: single-page web app sharing a repository with a desktop shell and a static site.

**Performance Goals**: match and reasons shown within 2 seconds for 20+ stored experts (SC-003);
in practice matching is synchronous and far below that.

**Constraints**: works with no outside service reachable (SC-006); no text below 16px, primary
controls 56px, visible focus (FR-024); amounts in whole cents (FR-020); every stand-in labelled
on screen (FR-022, FR-027).

**Scale/Scope**: one device, a handful of try-out accounts, tens of profiles. About 10 new
screens, 5 ports, 5 stand-ins, about 12 use cases.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
| --- | --- | --- |
| I. Older Adults First | Experts reach every input by conversation; typing is the alternative. New screens join the 16px, focus and axe checks in the same change. | Pass. The interview is a conversation with suggested replies; sign-in asks for one email address, which SC-001 allows. |
| II. People Decide, Agents Propose | Publishing, confirming a price, confirming a brief, proposing, accepting and marking a session held are separate use cases that only a signed-in person's action can call. | Pass. The drafting port returns drafts only; no use case it can reach changes a published or confirmed state. |
| III. Honest by Default | Every stand-in is labelled where it appears; payments say no money moved; the first screen says data stays on this device. | Pass. `ServiceStatus` is rendered on every screen that touches a stand-in, and a test asserts it. |
| IV. Test-First | Contract suites and use-case tests are written and seen failing before each adapter and use case. One Playwright journey per story. | Pass. |
| V. Simple Until Proven Otherwise | No backend, database or network call; no new dependency. | Pass. Stand-ins use `localStorage`. The amendment the spec anticipated is not needed until a real adapter is specified. |
| VI. Owned and Attributed | No new assets or dependencies. | Pass. |
| Workflow | App feature, so Spec Kit artifacts live in `specs/004-marketplace-foundation/`. | Pass. |

Post-design re-check (after Phase 1): no change. The fifth port (drafting agent) was added during
design because a real expert cannot use Margaret's script; it is a stand-in like the others and
adds no dependency.

## Project Structure

### Documentation (this feature)

```text
specs/004-marketplace-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ports.md        # the five ports and the behaviour each adapter must show
│   └── use-cases.md    # the actions a person can take, who may take them, and their errors
└── tasks.md            # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.tsx                    # chooses the walkthrough or the product from the URL hash
├── demo/                       # the scripted walkthrough, unchanged
│   └── domain/                 # match, price, proposal, advice: reused by the product
├── product/
│   ├── ProductApp.tsx          # signed-out and signed-in shells, service status banner
│   ├── routes.ts               # hash routes and which role may open each
│   ├── copy.ts                 # every user-facing string, in one place for translation
│   ├── model/                  # entity types, ids, cents, state transitions
│   ├── ports/                  # AuthPort, StorePort, AgentPort, PaymentsPort, MeetingsPort
│   │   └── contract/           # shared behaviour suites, one per port
│   ├── standins/               # the five in-browser adapters and their labels
│   ├── usecases/               # the rules: permissions, matching, booking, release
│   ├── calendar/               # .ics file for a session
│   └── screens/                # sign-in, role home, interview, profile, price, brief,
│                               # match, proposal, inbox, session, earnings, account
└── ui/tokens.css               # unchanged; product screens use the same tokens

e2e/
├── product-expert.spec.ts      # story 1
├── product-buyer.spec.ts       # story 2
├── product-booking.spec.ts     # stories 3 and 4
├── product-honesty.spec.ts     # story 5 and stand-in labels
└── product-a11y.spec.ts        # axe, 16px floor and focus on every product screen

site/_redirects                 # /app → /demo/#/app, so the product has a short address
```

**Structure Decision**: one bundle, one new top-level folder. The product lives in `src/product/`
and imports the existing pure rules from `src/demo/domain/` instead of copying them, so the
walkthrough and the product cannot disagree about what a match is. Ports and stand-ins are
separate folders so a real adapter is added as a new file that passes the existing contract
suite, with no change to `usecases/` or `screens/`.

## Phases

- **Phase 0, research**: [research.md](research.md). Ten decisions, none left open.
- **Phase 1, design**: [data-model.md](data-model.md), [contracts/ports.md](contracts/ports.md),
  [contracts/use-cases.md](contracts/use-cases.md), [quickstart.md](quickstart.md).
- **Phase 2, tasks**: `/speckit-tasks`, ordered by user story so each story can ship alone.

## Complexity Tracking

No constitution violations to justify.

| Choice that adds structure | Why it is needed | Simpler alternative rejected because |
| --- | --- | --- |
| A use-case layer between screens and ports | FR-004 and FR-016 are rules that must hold whatever the adapter; SC-005 tests them directly | Checking permissions in each screen would have to be redone, and re-proved, for every real adapter |
| Async port methods although `localStorage` is synchronous | A real adapter is a network call | Sync ports would force a rewrite of every caller when the first real service arrives |
