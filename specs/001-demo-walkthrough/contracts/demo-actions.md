# Contract: Demo steps and actions (UI ↔ state)

Module: `src/demo/state/reducer.ts`, `src/demo/state/steps.ts`.

## Steps

| # | id | chapter | persona | Next is enabled when |
|---|----|---------|---------|----------------------|
| 1 | `start` | — | — | always |
| 2 | `interview` | Margaret onboards | margaret | all interview turns shown |
| 3 | `profile` | Margaret onboards | margaret | profile published |
| 4 | `price` | Price | margaret | price confirmed |
| 5 | `briefChat` | Dev's brief | dev | all brief turns shown |
| 6 | `brief` | Dev's brief | dev | brief confirmed |
| 7 | `match` | Match | dev | match result is `match` |
| 8 | `proposal` | Book & pay | dev | proposal sent |
| 9 | `accept` | Book & pay | margaret | proposal accepted |
| 10 | `session` | Book & pay | both | session marked held |
| 11 | `debrief` | Debrief | margaret | all debrief turns shown |
| 12 | `workflow` | Debrief | margaret | workflow approved |
| 13 | `engine` | Engine | margaret | (last step) |

Chapters, in order: Margaret onboards → Price → Dev's brief → Match → Book & pay → Debrief → Engine.
`jumpTo(chapter)` lands on the chapter's first step.

## Actions

```ts
type DemoAction =
  // presenter navigation
  | { type: "next" }                     // no-op unless Next is enabled
  | { type: "back" }                     // to previous step; state of later steps is kept
  | { type: "restart" }                  // initial state, step 1
  | { type: "jumpTo"; chapter: Chapter } // replays scripted defaults for earlier steps
  // conversations
  | { type: "showNextTurn" }
  // Margaret (human decisions)
  | { type: "replyToAgent"; replyId: string }       // picks a scripted suggested reply; applies its effect
  | { type: "editCompetency"; id: string; label: string } // typed alternative
  | { type: "removeCompetency"; id: string }          // typed alternative
  | { type: "redoInterview" }            // rejects draft: back to step 2, turns reset
  | { type: "publishProfile" }
  | { type: "setPrice"; range: PriceRange }  // stores draft; invalid → error message
  | { type: "confirmPrice" }
  | { type: "acceptProposal" }
  | { type: "declineProposal" }
  | { type: "markSessionHeld" }
  | { type: "approveWorkflow" }
  // Dev (human decisions)
  | { type: "editBrief"; patch: Partial<Pick<Brief, "problem" | "units" | "budget">> }
  | { type: "confirmBrief" }             // rejected if invalid or restricted advice
  | { type: "setProposalUnits"; units: number }    // 1–4 (15–60 minutes)
  | { type: "setProposalPrice"; pricePerUnit: number }
  | { type: "sendProposal" };            // rejected if outside overlap
```

## Invariants (tested)

1. No action other than `publishProfile`, `confirmPrice`, `confirmBrief`, `sendProposal`,
   `acceptProposal`, `markSessionHeld`, `approveWorkflow` changes the corresponding flag; `next`
   never sets them. `jumpTo` sets them only for steps before the target chapter.
2. `publishProfile` fails (no-op + message) if fewer than 3 competencies remain or any label is
   empty.
3. `confirmPrice` fails if the range is invalid.
4. `confirmBrief` fails on invalid budget, empty problem, or restricted advice.
5. `sendProposal` fails if the price is outside the overlap; `declineProposal` clears the sent
   proposal, holds no payment, and returns to step 8 with a message for Dev.
6. Any change to Margaret's competencies after publishing sets `published = false` (back to
   draft); any price change after `confirmPrice` clears the confirmed price. Either way she is not
   matchable until she publishes/confirms again, and the match is recomputed.
9. Suggested replies are the primary way Margaret changes her profile and price; each reply's
   effect equals the equivalent typed action (`editCompetency`, `removeCompetency`, `setPrice`).
7. `restart` from any step returns a state deep-equal to the initial state.
8. `jumpTo(c)` produces the same state as clicking through the happy path to chapter `c`.
