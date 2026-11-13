# Data Model: Marketplace Foundation

Types live in `src/product/model/`. Ids are opaque strings. Times are ISO 8601 instants in UTC.
Money is integer cents unless marked "whole dollars per 15 minutes".

## Account

| Field | Type | Rule |
| --- | --- | --- |
| id | string | |
| email | string | Lower-cased and trimmed; unique |
| name | string | What the person asks to be called; may be empty until the interview |
| roles | set of `expert`, `buyer` | Empty until the person chooses one after their first sign-in; adding a role is an explicit action (FR-002) |
| activeRole | `expert` or `buyer` | Must be in `roles`; always shown |
| createdAt | instant | |

Deleting an account removes its profile, briefs and proposals it sent that are still waiting.
Sessions that were confirmed keep a record with the person's name replaced by "Deleted account".

## ExpertProfile

Extends the walkthrough's `Expert` shape so the existing matching rule accepts it unchanged.

| Field | Type | Rule |
| --- | --- | --- |
| accountId | string | One profile per account |
| headline, location | string | |
| yearsExperience | integer | 0 or more |
| skills | list of Skill | 1 to 5 to publish |
| exampleProblems | list of string | |
| priceRange | `{min, max}` whole dollars per 15 minutes, or none | Valid per `validateRange` |
| priceConfirmed | boolean | True only through the confirm-price use case |
| state | `draft` or `published` | Changes only through publish and unpublish (FR-006) |
| selfDeclared | always true | Shown on the profile (FR-005) |

**Skill**: `id`, `tag` (from the catalogue), `label` (editable, not empty), `description`,
`source` (`{kind: "interview", turn}` or `{kind: "edited"}`).

**Matchable** means `state = published` and `priceConfirmed` and a valid `priceRange` (FR-009).

State transitions: `draft → published` (needs 1 to 5 skills), `published → draft` (unpublish).
Editing a published profile keeps it published.

## Brief

| Field | Type | Rule |
| --- | --- | --- |
| id, buyerId | string | |
| problem | string | Not empty |
| skillTag | string | From the catalogue |
| units | integer | 1 to 8 (15 minutes to 2 hours) |
| budget | `{min, max}` whole dollars per 15 minutes | Valid per `validateRange` |
| state | `draft` or `confirmed` | Confirm is explicit; refused for regulated advice (FR-012) |

## Match

Not stored as a decision; computed from a confirmed brief and the profiles matchable at that
moment, then kept with the brief so the buyer can reopen it.

| Field | Type |
| --- | --- |
| briefId | string |
| computedAt | instant |
| result | the walkthrough's `MatchResult` (chosen expert, shared range, reasons, others) |

A stored match is **stale** when its chosen expert is no longer matchable or their price range no
longer overlaps the budget. A stale match is shown as unavailable and can be recomputed.

## Proposal

| Field | Type | Rule |
| --- | --- | --- |
| id, briefId, buyerId, expertId | string | |
| units | integer | Copied from the brief; may be changed within 1 to 8 |
| pricePerUnit | whole dollars | Inside the shared range when sent and when answered |
| startsAt | instant | In the future when sent |
| state | `waiting`, `accepted`, `declined`, `withdrawn`, `unavailable` | |

Transitions: `waiting → accepted | declined` (expert), `waiting → withdrawn` (buyer),
`waiting → unavailable` (another proposal for an overlapping time was accepted).

## Session

Created only by accepting a proposal.

| Field | Type | Rule |
| --- | --- | --- |
| id, proposalId, buyerId, expertId | string | |
| startsAt, endsAt | instant | `endsAt = startsAt + units × 15 minutes` |
| totalCents | integer | `units × pricePerUnit × 100` |
| meeting | `{url, provider, standIn}` | From `MeetingsPort` |
| state | `confirmed`, `held`, `cancelled` | |

"Awaiting confirmation" is not stored: it is a `confirmed` session whose `endsAt` has passed.

Transitions: `confirmed → held` (expert, only after `endsAt`), `confirmed → cancelled` (either
person, only before `startsAt`).

## Payment

| Field | Type | Rule |
| --- | --- | --- |
| id, sessionId | string | |
| key | string | The proposal id; one payment per key (FR-016) |
| amountCents | integer | Equals the session total |
| feeCents | integer | 10% of the amount, rounded half up |
| owedCents | integer | `amountCents − feeCents` |
| state | `held`, `released`, `lifted` | |
| standIn | boolean | True for every payment in this version |

Transitions: `held → released` (session marked held), `held → lifted` (session cancelled).

## SignInCode (stand-in only)

`email`, `code` (six digits), `expiresAt` (10 minutes), `used`. One live code per email.

## Skill catalogue

A fixed list: `tag`, `label`, `keywords`. Starts with the walkthrough's tags
(`contract-manufacturing`, `supplier-negotiation`, `supplier-audits`, `cost-down`,
`hospital-operations`, `staff-scheduling`, `vendor-management`, `logistics`) plus a small general
set (bookkeeping, hiring, sales, clinic operations, construction bids, grant writing).
