---
name: gstack-verify
description: Use while coding, before /gstack-ship - run Agely's full check set (tsc, Vitest, build, Playwright, cargo fmt/clippy/test), fix what breaks, repeat until green. Adapted from gstack /verify.
---

<!-- Adapted from garrytan/gstack verify/SKILL.md @ f0cd9f8c (MIT). gstack runtime
     (gstack-checks, telemetry, learnings) removed; checks hardcoded to Agely's
     constitution "done" list and .github/workflows/ci.yml. See docs/tooling/gstack.md. -->

# /gstack-verify: build, check, fix, repeat

Use this while building. It runs checks and fixes code. It never reviews, bumps a
version, pushes, or opens a PR: that is `/gstack-ship`.

## 1. The check set

These are the checks the constitution (Principle IV) and `ci.yml` require. Run them from
the repo root. Each Bash call is a fresh shell.

| # | Name | Command | Notes |
|---|------|---------|-------|
| 1 | typecheck | `bunx tsc --noEmit` | |
| 2 | unit | `bun run test` | Vitest |
| 3 | build | `bun run build` | `tsc && vite build`, creates `dist/` |
| 4 | e2e-typecheck | `bunx tsc -p e2e/tsconfig.json` | |
| 5 | e2e | `bun run e2e` | Playwright; starts its own Vite server on `E2E_PORT` (default 1493, never 1420) |
| 6 | rust-fmt | `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | needs `dist/` to exist (run build first, or `mkdir -p dist`) |
| 7 | rust-clippy | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | |
| 8 | rust-test | `cargo test --manifest-path src-tauri/Cargo.toml` | |

Scope shortcut while iterating: if `git diff --name-only main...HEAD` plus uncommitted
changes touch nothing under `src-tauri/`, you may skip 6-8 during the loop, but the
final run in step 3 always runs all eight. Never invent a command the repo does not declare;
if `package.json` scripts or `ci.yml` change, follow them instead of this table.

If `node_modules/` is missing, say so and ask before running `bun install`. If Playwright
browsers are missing (`bunx playwright install chromium` would be needed), report it as ENV
and ask; do not install on your own.

## 2. Loop: run, fix, run

Run the checks in order, recording `CHECK <name> PASS|FAIL|ENV|TIMEOUT <secs>` for each.
Show at most 40 failing lines per check.

- **FAIL:** fix the code under test. A changed source file breaking an untouched test is
  your bug, not a pre-existing one. Call a failure "possibly pre-existing" only if it was
  already red on your first run this session, before any edit (check with `git stash` only
  if the user agrees).
- **No test covers a touched file** (new module in `src/` with no `*.test.ts(x)` nearby, or a
  new user-facing flow with no Playwright journey): that is a gap. Principle IV requires
  domain logic tests seen failing first and one Playwright journey per flow. Add the test,
  or report the gap explicitly. Never call a change green when no test covers it.
- **ENV / TIMEOUT:** a missing tool, browser, service or network. Report it with the log
  line; do not fix the environment or work around it.
- While fixing one check, rerun only that check; then a full run before you stop.

**Never** weaken, skip (`.skip`, `.only`, `#[ignore]`), delete or edit a test, a lint/tsconfig
setting, a clippy allow, or a `package.json` script to get green.

Stop after 5 full runs, when the same failure comes back twice after a fix, or on ENV/TIMEOUT.
Report what is still red and why. Before another fix to a stubborn red in your own change,
reproduce it in one focused test and trace the root cause.

## 3. Hand off

Do a final full run of all eight checks on the current tree, with no edits after it. Print:

```
VERIFY: READY_FOR_SHIP head=<git rev-parse --short HEAD> dirty=<yes|no from git status --porcelain> checks=8/8
```

Any edit after this line invalidates it; rerun the affected checks.

Only print `READY_FOR_SHIP` when all eight passed on this exact tree; otherwise print
`VERIFY: NOT_READY` with the red checks. Stop with "ready for /gstack-ship".

## Completion status

End with one of: **DONE** (all green, evidence above), **DONE_WITH_CONCERNS** (green, but
list gaps such as untested files), **BLOCKED** (state the blocker and what was tried),
**NEEDS_CONTEXT** (state exactly what is missing).
