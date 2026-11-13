---
name: costs-update
description: Use when recording a cost of building Agely or refreshing the AI spend on the public cost ledger (site/costs/) - a new payment, a receipt, more AI sessions, more hours.
---

# /costs-update: keep the cost ledger true

The ledger at agely.dev/costs/ is drawn from `site/costs/costs.json`. Its rules are in the
constitution (principle III) and enforced by `site/costs/costs.test.js`.

## The four kinds

| Kind | Use it when | It needs |
| --- | --- | --- |
| `paid` | Money left someone's account | `amount`, `evidence` (a receipt reference, or who gave the figure), `date` when known |
| `estimate` | The figure is calculated | `amount`, `date`, and a `method` that states the inputs and the weak points |
| `free` | A service on a free plan | `amount: 0`, and why it is free |
| `missing` | A real cost with no amount yet | `amount: null`, and what is needed to fill it |

Never invent an amount. If the owner has not given a figure and it cannot be measured, the line
is `missing`.

## Refreshing AI spend

1. Count tokens from the local agent logs. The script reads token counts only.

   ```bash
   node scripts/ai-usage.mjs ~/.claude/projects/<this-project-dir>... \
     --codex ~/.codex/sessions/<year> --match 'agely'
   ```

2. Copy each model's `listPriceUsd` and token counts into `aiUsage.models`, and the same dollar
   figure into that model's `estimate` entry. The test fails if the two drift apart.
3. If a model is missing from the price table in `scripts/ai-usage.mjs`, look its price up from
   the provider's own price list, add it with the date, and say in the entry's `method` where
   the price came from. Do not price from memory.
4. Update `aiUsage.coverage` if the dates or machines covered changed.

The logs are on one person's machine. Do not copy paths, prompts or file names into the ledger.

## Finishing

1. Set `asOf` to today.
2. Run `bunx vitest run site/costs`.
3. Run `/site-check` and look at `/costs/` at phone width.
4. In the pull request, list each line added or changed and where its figure came from.
