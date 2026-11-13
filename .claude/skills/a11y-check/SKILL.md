---
name: a11y-check
description: Use when adding or changing a screen in the app (src/demo/screens, src/ui) or a page in site/ - checks the constitution's Older Adults First rules (16px floor, 56px controls, focus rings, contrast, no colour-only meaning) and what to do when a check fails.
---

# /a11y-check: Older Adults First, verified

Principle I of the constitution is tested. This skill runs those tests and covers the parts a
tool cannot judge.

## What the tools check

| Rule | App (`src/`) | Website (`site/`) |
| --- | --- | --- |
| No text below 16px | `e2e/layout.spec.ts` | `scripts/site-check.mjs` |
| Visible focus ring on every control | `e2e/layout.spec.ts` | by hand, see below |
| WCAG 2.1 AA: contrast, names, roles, labels | `e2e/a11y.spec.ts` | `scripts/site-check.mjs` |
| No horizontal overflow | `e2e/layout.spec.ts` | `scripts/site-check.mjs` |

```bash
bunx playwright test e2e/a11y.spec.ts e2e/layout.spec.ts   # app
bun run build:site && bun scripts/site-check.mjs            # website
```

A new app screen must be reachable from the chapter list, or added to the loop in both specs, in
the same change. A new website page is added to `PAGES` in `scripts/site-check.mjs`.

## When a check fails

- **Contrast.** Fix the token in `src/ui/tokens.css` (app) or the `:root` block of the page's
  stylesheet (website), so every use improves. Normal text needs 4.5:1; text of 24px or more,
  or 18.66px bold, needs 3:1. Check the dark-mode value of a website token as well.
- **Small text.** Use a size token. Do not exclude the element.
- **Missing name or label.** Give the control visible text first; reach for `aria-label` only
  when there is no room for words.
- Never weaken or skip a check to make a change pass. If a finding is a false positive, exclude
  that one selector and say why in a comment.

## What only a person can check

Do these for every new screen and say in the pull request that you did.

1. **Controls are big enough.** Primary actions use `--control-h` (56px). Anything tappable is at
   least 44px in both directions.
2. **Keyboard only.** Tab through the screen. Every control is reachable, in reading order, and
   you can always see where focus is.
3. **Not colour alone.** State (selected, met, failed, draft) is also carried by a word, an icon
   or a border style. Look at the screen in greyscale if unsure.
4. **One decision per screen**, in plain words. The button says what will happen.
5. **Zoom.** At 200% browser zoom nothing is cut off or overlaps.
6. **Motion.** Nothing moves unless the person asked for it.
