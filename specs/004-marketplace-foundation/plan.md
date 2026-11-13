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

## Plan Review (2026-11-14)

Re-run of the planning workflow after phases 1 and 2 were built, to check the plan against the
code and close gaps before the stories. The plan above stands; this section records what changed.

### Where the build is

Tasks T001 to T012 and the sign-in part of T016 are done on pull request #19: model, money,
skill catalogue, five ports with contract suites and stand-ins, the sign-in and role use cases,
and a shell at `#/app`. 60 unit tests and 8 browser tests cover them.

### Drift found between the documents and the code, now corrected

| Document | Was | Now matches the code |
| --- | --- | --- |
| `contracts/ports.md` | `confirmCode` returned only an account id | Also returns the email in its normal form |
| `contracts/ports.md` | `hold` could fail two ways | Four: adds `amount-mismatch` and `invalid-amount` |
| `contracts/ports.md` | A draft with no skill "says so" | `unmatched: true` with no skills, or `skillTag: null` |
| `contracts/use-cases.md` | `addRole` | `chooseRole`; sign-in use cases listed |
| `data-model.md` | An account has at least one role | Roles are empty until the person chooses |

### Gaps closed by new decisions

| Gap | Decision |
| --- | --- |
| `matchBrief` needs an age and `validateProposal` names Margaret | R12: widen both signatures; one rule, no copy |
| Where a real person's name comes from; whether to ask their age | R13: first interview question; no age stored |
| Pull request #20 rewrites files this feature must change | R14: stories start after #20 merges; screens use `t()` from the start |
| The shell has no addresses below `#/app` | R15: a route table in `src/product/routes.ts` |
| How a buyer chooses a time | R16: suggested times plus the browser's own control |
| Deleting an account left its sign-in link behind | R17: `AuthPort.forget` |
| What the stand-ins cannot do | R18: three limits, stated on screen, not worked around |

### Constitution Check, re-evaluated

| Principle | Finding | Status |
| --- | --- | --- |
| I. Older Adults First | The shell passes axe, the 16px floor and overflow checks in all three states. Asking for a name is one more spoken answer, not a field. The time control (R16) is on the buyer's side. | Pass |
| II. People Decide, Agents Propose | `AgentPort` returns drafts only, and its contract forbids a published or confirmed state. An unmatched draft cannot be published. | Pass |
| III. Honest by Default | Every stand-in is labelled and a browser test asserts all five. R18 adds three stated limits. | Pass |
| IV. Test-First | **Deviation in phase 2**: contract suites were written before their adapters, but the model and use-case tests were written with their code, not seen failing first. No code is affected, so nothing is redone. From story 1 on, each test task is committed failing before the task that passes it. | Pass with a recorded deviation |
| V. Simple Until Proven Otherwise | Still no backend, network call or dependency. R12 changes two existing signatures instead of adding a parallel rule. | Pass |
| VI. Owned and Attributed | Nothing added. | Pass |

No violation needs an entry in Complexity Tracking.

### What this means for the task list

`tasks.md` predates this review. Before story 1, re-run `/speckit-tasks` so it includes:

- A prerequisite: rebase on main after pull request #20 merges (R14).
- R12: widen `matchBrief` and `validateProposal`, with the walkthrough's tests unchanged and green.
- R13: the name question, `setName`, and removing any use of age.
- R15: the route table and splitting the shell into screens, before T017.
- R17: `AuthPort.forget` with contract tests, before `deleteAccount`.
- R16 and R18 inside the booking and honesty stories.
- Adding `/demo/#/app` to `scripts/site-check.mjs`, so the product is in the website check.

### Decision needed from the owner

One: whether the product's sentences may be exempt from #20's translation-completeness check
until story 5 (R14). Everything else in this review is decided.

## Phases

- **Phase 0, research**: [research.md](research.md). Eighteen decisions; one point in R14 waits
  on the owner.
- **Phase 1, design**: [data-model.md](data-model.md), [contracts/ports.md](contracts/ports.md),
  [contracts/use-cases.md](contracts/use-cases.md), [quickstart.md](quickstart.md).
- **Phase 2, tasks**: `/speckit-tasks`, ordered by user story so each story can ship alone.

## Complexity Tracking

No constitution violations to justify.

| Choice that adds structure | Why it is needed | Simpler alternative rejected because |
| --- | --- | --- |
| A use-case layer between screens and ports | FR-004 and FR-016 are rules that must hold whatever the adapter; SC-005 tests them directly | Checking permissions in each screen would have to be redone, and re-proved, for every real adapter |
| Async port methods although `localStorage` is synchronous | A real adapter is a network call | Sync ports would force a rewrite of every caller when the first real service arrives |
