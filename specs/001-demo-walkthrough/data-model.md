# Data Model: Demo Walkthrough

All entities are in-memory TypeScript types (`src/demo/domain/types.ts`). Money is integer USD.
"Unit" means one 15-minute block.

## Persona

`"margaret" | "dev" | "both"`: who is on screen for a step (drives `PersonaBanner`).

## Expert

| Field | Type | Rules |
|-------|------|-------|
| id | string | unique |
| name | string | |
| age | number | |
| headline | string | |
| yearsExperience | number | ≥ 0 |
| location | string | experts may be anywhere |
| competencies | Competency[] | 3–5 when published (FR-007) |
| exampleProblems | string[] | |
| priceRange | PriceRange \| null | required to be matchable |
| published | boolean | only `true` via the `publishProfile` action |
| credentialsSelfDeclared | true | always shown as self-declared (FR-012) |

## Competency

| Field | Type | Rules |
|-------|------|-------|
| id | string | unique within expert |
| tag | string | matching key, e.g. `contract-manufacturing` |
| label | string | editable by the expert; must be non-empty after trim |
| description | string | |
| source | `{ kind: "interview", turn: number } \| { kind: "document", name: string }` | FR-007 traceability |

## ConversationTurn

`{ speaker: "agent" | "margaret" | "dev"; text: string }`, ordered. A `Conversation` is
`{ id: "interview" | "brief" | "debrief"; turns: ConversationTurn[]; shown: number }`, with
`0 ≤ shown ≤ turns.length`.

## SuggestedReply

`{ id: string; text: string; effect: ReplyEffect }`, where `ReplyEffect` is one of
`{ kind: "renameCompetency"; id; label }`, `{ kind: "removeCompetency"; id }`,
`{ kind: "setPrice"; range }`, `{ kind: "none" }`. A reply is what Margaret says to the agent; its
effect is identical to the typed alternative (contract invariant 9).

## PriceRange

`{ min: number; max: number }` in USD per unit.
- Valid iff both are integers ≥ 1 and `min ≤ max` (FR-011).
- `overlap(a, b)` = `{ min: max(a.min, b.min), max: min(a.max, b.max) }` if non-empty, else `null`.

`PriceSuggestion`: `{ range: PriceRange; reasons: string[] }` with at least 2 reasons (FR-010).

## Brief

| Field | Type | Rules |
|-------|------|-------|
| problem | string | non-empty; must not trip the restricted-advice guard (FR-015) |
| competencyTag | string | |
| competencyLabel | string | shown to the buyer |
| units | number | integer ≥ 1 (2 = 30 minutes) |
| budget | PriceRange | valid per PriceRange rules |
| confirmed | boolean | only `true` via `confirmBrief` |

## MatchResult

```ts
| { kind: "match"; expert: Expert; matchedCompetencies: Competency[]; overlap: PriceRange;
    explanation: string[]; others: { expert: Expert; reason: "competency" | "price" | "unpublished" }[] }
| { kind: "none"; reason: "competency" | "price"; explanation: string }
```

## Proposal

`{ units: number; pricePerUnit: number; total: number }`, with `total = units × pricePerUnit`.
A price outside the match overlap is flagged before sending (FR-019); it is sendable only within
the overlap.

## Session

| Field | Type | Rules |
|-------|------|-------|
| id | string | |
| startsAt | Date | today + 2 days, 10:00 local |
| units | number | from the proposal |
| pricePerUnit | number | |
| total | number | |
| call | `{ url: string; provider: "Google Meet"; isDemo: true }` | |
| status | `"proposed" → "accepted" \| "declined"`; `"accepted" → "held"` | |
| payment | PaymentHold | |

`PaymentHold`: `{ status: "none" | "held" | "released"; amount: number; demo: true }`.
Transitions: `none → held` on `acceptProposal`; `held → released` on `markSessionHeld`.
A declined proposal holds nothing.

## Workflow

`{ name: string; questions: string[]; checks: string[]; watchOuts: string[]; status: "proposed" | "approved" }`.
Only the `approveWorkflow` action moves it to `approved` (FR-023).

## Engine (derived)

`{ workflows: Workflow[] (approved only); sessionsCompleted: number; earnings: number }`, derived
from state: sessions with status `held` and payment `released`.

## Scripted seed values

- Margaret Okafor, 68, Columbus, Ohio, 34 years in procurement; competencies: Contract
  manufacturing terms (`contract-manufacturing`), Supplier negotiation, Supplier quality audits,
  Cost-down programmes. Suggested price $60–$90/unit.
- Dev Patel, founder of a 6-person hardware startup. Brief: 2 units, budget $50–$100/unit,
  competency `contract-manufacturing`.
- Other experts: Harold Brooks (hospital operations, $40–$60, no matching tag), Lin Zhao
  (retired supply-chain VP, `contract-manufacturing`, $120–$160: price gap).
- Overlap with Margaret: $60–$90; proposal 2 × $75 = $150.
