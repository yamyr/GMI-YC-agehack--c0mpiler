---
name: site-check
description: Use after changing anything in site/ (landing page, simulator, cost ledger) or vite.config.ts - builds the website, opens every page at desktop and phone width in light and dark, and reports errors, overflow, small text and accessibility failures.
---

# /site-check: look at the website before calling it done

The constitution (principle IV) says a changed page must be opened in a browser at desktop and
phone width. This is how.

## Steps

1. Build the website. This replaces whatever is in `dist/`.

   ```bash
   bun run build:site
   ```

2. Run the checker. Give it a scratch directory if you want screenshots; never a path inside
   the repository.

   ```bash
   bun scripts/site-check.mjs <screenshot-dir>
   ```

   It loads `/`, `/simulator/`, `/costs/` and `/demo/` in three views and reports failed
   requests, script errors, horizontal overflow, text below 16px and axe WCAG 2.1 AA violations.
   It exits 1 if it finds anything.

3. Fix what it reports in the page, not in the checker. Do not add an exclusion to make a
   finding go away. If a finding is wrong, say why in a comment beside the exclusion.

4. Look at the screenshots of the pages you changed. The checker cannot see a layout that is
   legal but ugly: collisions, awkward wrapping, a chart whose labels cross its marks.

5. If you added a page, add its path to `PAGES` in `scripts/site-check.mjs` in the same change.

6. Rebuild the app output if you need it next: `bun run build` (Tauri reads `dist/`).

## Report

Say which pages and views were checked, what was found and fixed, and whether you looked at the
screenshots. If the Cloudflare preview was not opened after pushing, say so.
