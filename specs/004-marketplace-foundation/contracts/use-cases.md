# Contract: Use Cases

Functions in `src/product/usecases/`. Each takes the ports and the acting account id, and returns
a result or a typed error. Screens call these and nothing else. "Explicit" means the function is
called only from a button the person pressed; no agent output and no effect calls it.

| Use case | Who may call it | What it does | Refuses when |
| --- | --- | --- | --- |
| `addRole(role)` | the account | Adds `expert` or `buyer` and makes it active | |
| `saveProfileDraft(draft)` | the profile's owner | Stores an agent draft or an edit as `draft` or keeps `published` | not signed in; not the owner |
| `publishProfile()` *explicit* | the owner | `draft → published` | fewer than 1 or more than 5 skills; an empty skill label |
| `unpublishProfile()` *explicit* | the owner | `published → draft` | |
| `confirmPrice(range)` *explicit* | the owner | Stores the range and sets `priceConfirmed` | range invalid per `validateRange` |
| `saveBriefDraft(draft)` | the brief's buyer | Stores as `draft` | not the buyer |
| `confirmBrief(id)` *explicit* | the buyer | `draft → confirmed` | regulated advice per `advice.ts`; invalid budget or units |
| `runMatch(briefId)` | the buyer | Computes with `matchBrief` over matchable profiles and stores the result | brief not confirmed |
| `sendProposal(briefId, units, price, startsAt)` *explicit* | the buyer | Creates a `waiting` proposal | match missing or stale; price outside the shared range; time in the past |
| `withdrawProposal(id)` *explicit* | the buyer | `waiting → withdrawn` | not waiting |
| `acceptProposal(id)` *explicit* | the proposal's expert | Holds the payment, then creates the session and its meeting link, then marks overlapping waiting proposals `unavailable`, in one transaction | not waiting; price no longer inside the shared range; hold failed (session is not created) |
| `declineProposal(id)` *explicit* | the proposal's expert | `waiting → declined` | not waiting |
| `cancelSession(id)` *explicit* | its buyer or its expert | `confirmed → cancelled`, lifts the hold | already started |
| `markSessionHeld(id)` *explicit* | its expert | `confirmed → held`, releases the payment | before the session's end |
| `listMySessions()`, `earnings()` | the account | Only sessions and payments the account is part of | |
| `deleteAccount()` *explicit* | the account | Removes the account and its data as the data model describes | a confirmed session has not finished |

## Rules every use case follows

- An account id that is not signed in gets `not-signed-in`. An account acting on something that
  is not theirs gets `not-yours`, and learns nothing about the thing (not even that it exists).
- `acceptProposal` called twice produces one session and one payment.
- No use case that changes `published`, `priceConfirmed`, `confirmed`, a proposal's state or a
  session's state is reachable from `AgentPort` output without a person's action.
- Errors are values with a code; the sentence shown to the person comes from `copy.ts`.

## Routes

Hash routes under `#/app`. A route a person may not open redirects to their role's home.

| Route | Who | Screen |
| --- | --- | --- |
| `#/app` | anyone | Sign in, with the try-out notice (FR-027) and service status |
| `#/app/home` | signed in | Role home: what to do next |
| `#/app/expert/interview`, `/profile`, `/price` | expert | Story 1 |
| `#/app/expert/inbox`, `/earnings` | expert | Stories 3 and 4 |
| `#/app/buyer/brief`, `/match`, `/proposal` | buyer | Stories 2 and 3 |
| `#/app/session/:id` | its buyer or expert | Story 3 |
| `#/app/account` | signed in | Roles, sign out, delete, service status |
