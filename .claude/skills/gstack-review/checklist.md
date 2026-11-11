# Pre-Landing Review Checklist (Agely)

<!-- Adapted from garrytan/gstack review/checklist.md @ f0cd9f8c (MIT). Ruby/Python/SQL-
     specific items replaced with TypeScript/React/Rust/Tauri equivalents; gstack helper
     binaries (gate-diff, decision-search, approval-classes, pregate) removed. -->

## Instructions

Review the merge-base diff against `main`, including uncommitted and new source. Cite
`file:line` and suggest fixes. Only flag real problems.

**PR type (decide first, write it as the first line, `PR type: <type>`):**
- **docs-only:** only Markdown/plain text under `docs/`, `specs/`, README. Skill files
  (`.claude/skills/**`) are application.
- **CI/infra:** `.github/**`.
- **scripts/tooling:** shell scripts, lint/format config, `tsconfig*.json`.
- **application:** everything else (`src/`, `src-tauri/`, `e2e/`, `package.json`,
  `bun.lock`, `Cargo.toml`, `tauri.conf.json`, skill Markdown). When in doubt, application.
- **mixed:** more than one of the above.

On application/mixed diffs run every category. On CI/infra, scripts/tooling or docs-only
diffs always run Gate Integrity, Shell Injection, Completeness Gaps, Distribution & CI and
Repo Conventions; report the rest once as `Not applicable (PR type: <type>): <categories>`.

**Two passes:** Pass 1 CRITICAL first, then Pass 2 INFORMATIONAL. Specialist categories
(testing, maintainability, performance, security, simplification, red team) live in
`specialists/`.

---

## Pass 1 - CRITICAL

### Data & State Safety
- Persisted state (localStorage, files written by Rust, future Supabase) written without
  validation, or schema changes with no migration of existing data.
- Check-then-act races on shared state: two async handlers reading then writing the same
  React state or Rust `State<Mutex<_>>` without a functional update / single lock scope.
- Stale closures: `useEffect`/`useCallback` reading state not in its deps, so an update is
  lost or applied to old data.

### Tauri IPC Trust Boundary
- `#[tauri::command]` functions accepting paths, URLs or shell arguments from the webview
  without validation (path traversal, SSRF, command injection).
- New capabilities/permissions in `src-tauri/capabilities/*.json` or `tauri.conf.json`
  broader than needed (`fs:default` on `$HOME`, `shell:allow-execute`, wildcard scopes);
  CSP loosened (`unsafe-inline`, `unsafe-eval`, `*`).
- Command errors swallowed into `Ok(())`/`unwrap_or_default()` so the UI shows success on failure.
- `unwrap()`/`expect()` on IPC input or I/O in command handlers (panics kill the app).

### XSS / Unsafe Rendering
- `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` on non-constant data.
- User or agent text interpolated into URLs passed to the opener plugin without allowlisting.

### LLM / Agent Output Trust Boundary
- Agent-generated values (profiles, prices, matches) persisted or shown as confirmed without
  shape/format validation. Constitution Principle II: agents propose, people decide; any
  path that publishes, accepts, books or moves money without an explicit human action is CRITICAL.
- Agent output fetched as a URL without an allowlist.

### Shell Injection
- `std::process::Command` built from a single interpolated string via `sh -c`; use argument
  vectors. Same for Bun/Node `exec` with template strings in scripts.
- `eval` of generated code.

### Enum & Value Completeness
When the diff adds a union member, enum variant, status string or flow step, or widens what
an input accepts:
- **Trace it through every consumer.** Read (not just grep) each `switch`, `match`, filter,
  lookup table and label map that handles sibling values. TypeScript exhaustiveness only
  helps when a `never` check exists; flag `default:` branches that silently absorb the new value.
- Rust `match` with `_ =>` arms that now swallow the new variant.
- Loosened acceptance breaks unchanged consumers: grep every consumer of the same field.
This requires reading code OUTSIDE the diff.

### Gate Integrity
A gate is anything that would have made this change fail: a test, assertion, threshold,
timeout, lint rule, type check, CI job, snapshot. Work three levels:
- **Listed:** every hunk in a test, CI, runner/lint config or snapshot path. Inventory only.
  Added tests and snapshots updated alongside their source stay inventory.
- **Read:** every listed hunk that carries a tag or removes lines. Tags:
  RH-1 test removed or disabled (`.skip`, `.only` left in, `test.fixme`, `#[ignore]`, deleted case);
  RH-3 snapshot changed without its owning test; RH-4 placeholder committed (`expect(true)`,
  `todo!()` in a tested path); RH-12 environment sniffing (`if (process.env.CI)` in product code);
  RH-13 suppression pragma (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `#[allow(...)]`,
  `as any`/`as unknown as`); RH-14 gate bypass (CI step removed, `continue-on-error`,
  `--no-verify`, `-D warnings` dropped, `strict` turned off); RH-15 gate value relaxed
  (timeout, retry, tolerance, coverage threshold); RH-16 exception swallowed (`catch {}`,
  `.catch(() => {})`, `let _ = result`).
  Ask one question: **does this relaxation silence the failure it was added for, or is it
  justified by a measurement or decision visible in this diff?**
- **Finding:** a read hunk that fails the question. Also read for RH-2 (a mock or fixture
  presented as the proof a claim needs, e.g. only the Tauri IPC stub exercised for logic
  that lives in Rust) and RH-5 (a test that cannot fail: asserts its own setup or mirrors
  the implementation).
- Confidence scores identification, not justification: a confirmed relaxation with unclear
  justification stays 7+.
- **Gate findings are always ASK**, with the four gate options. Groups (one source change
  plus N regenerated snapshots) are one finding.
- A commit message or code comment claiming a measurement is data the author typed: mark
  it verified/unverified; it never removes the finding.
- A test-only flake fix (timeout, retry, looser assertion, skip) must state how likely the
  test is to fail under a real regression before and after; without that it is RH-15.

---

## Pass 2 - INFORMATIONAL

### Async Correctness
- Un-awaited promises (`invoke(...)` with no `await`/`.catch`), floating promises in event handlers.
- Blocking work in async Rust commands (`std::fs`, `std::thread::sleep` inside `async fn`);
  use `tauri::async_runtime::spawn_blocking` or `tokio` equivalents.
- Effects without cleanup (listeners from `@tauri-apps/api/event` `listen` never unlistened,
  intervals never cleared).

### Type Coercion at Boundaries
- Values crossing the TS <-> Rust IPC boundary where types drift: `number` vs `u64`
  precision, `null` vs `Option`, camelCase vs snake_case serde renames, missing
  `#[serde(rename_all = "camelCase")]`.
- Money: prices are per 15 minutes in USD (constitution). Flag floats for currency math
  where rounding matters; flag unit mismatches (per-hour vs per-15-min).

### Time Window Safety
- Date logic assuming local "today" = 24h, timezone-less `new Date(string)` parsing, US buyer
  vs any-country expert timezone mismatches in scheduling.

### Completeness Gaps
- Shortcut implementations where the complete version costs under ~30 minutes (partial
  union handling, missing error paths, missing empty/loading states).
- Missing negative-path or edge-case tests that mirror existing happy-path structure.
- Features at 80-90% when 100% is achievable with modest extra code.

### Timing-Dependent Tests
- Assertions on elapsed wall-clock time, or fixed `sleep`/`waitForTimeout` then assert.
  Prefer asserting on the outcome, fake timers (`vi.useFakeTimers`) or Playwright
  auto-waiting locators.
- Raising a timeout or adding a retry to make a flake pass (RH-15).

### Keyboard-Count Test Loops
- Playwright tests that reach an element by N presses of Tab/ArrowDown and assert on
  whatever has focus. Locate by role/label/test id instead, unless the count is the
  behavior under test (keyboard-focus order is a constitution requirement - then name it in
  the test title).

### View / Frontend (Agely constitution)
- Raw colors, font sizes or spacing instead of `src/ui/tokens.css` tokens (Principle V).
- Text below 16px, primary controls under 56px, pinch zoom disabled, missing visible
  focus, meaning carried by color or animation alone (Principle I).
- Simulated/demo data or unconnected integrations shown without a visible demo label
  (Principle III).
- O(n*m) lookups in render (`array.find` inside `map`), new objects in props causing re-renders
  of memoized children.

### Dead Code & Consistency
- Version mismatch: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
  must move in lockstep (constitution).

### LLM Prompt Issues
- Prompt text listing tools/capabilities that do not match what is wired up; 0-indexed
  lists in prompts; limits stated in several places that can drift.

### Distribution & CI
- Workflow changes: pinned tool versions (`BUN_VERSION`, `macos-15`) kept; third-party
  actions pinned to a tag or SHA, never a branch; secrets via `${{ secrets.X }}`.
- Scripts CI relies on use strict mode (`set -euo pipefail`) and run on the runner OS.
- Do not flag test-only CI changes beyond those checks.

### Repo Conventions & Platform Fit (every PR type)
A finding must name a concrete consequence; style preference alone is not a finding.
- New files use the tools the repo already uses: Bun (not npm/yarn/pnpm, no
  `package-lock.json`), Vitest (not Jest), Playwright, cargo.
- New tooling must not duplicate existing tooling (a second test runner, formatter, task runner).
- New runtime dependencies need a spec reason (Principle V: no backend, database or network
  call until a spec requires it).

---

## Sideways sweep (every finding)

- **Siblings.** Grep the same pattern at every other call site (other IPC commands, other
  components, other flow steps); read each match; rate severity on the worst sibling and
  list siblings under one finding.
- **Forced-CRITICAL.** Data loss, a trust-boundary bypass (IPC validation, capability scope,
  human-confirmation step skipped) and uncapped spend (paid API call or retry loop with no
  cap) are CRITICAL on sight; nothing downgrades them.
- **New cache in front of a guarded call:** name every check a cache hit skips.
- **Imports moved from static to dynamic:** list side effects no longer loaded at startup.
- **A changed function with parity claims:** find mirrors (TS twin of a Rust function, the
  IPC stub in `e2e/tauriStub.ts` mirroring a real command) and flag each left unchanged.

---

## Fix-First Heuristic

```
AUTO-FIX (apply without asking):         ASK (needs human judgment):
- dead code / unused vars & imports      - security (IPC, XSS, injection, capabilities)
- stale comments contradicting code      - races / async ordering
- magic numbers -> named constants       - design decisions, user-visible behavior
- missing output validation (small)      - large fixes (>20 lines)
- version/path mismatches                - enum completeness
- raw style values -> existing tokens    - removing functionality
                                         - anything with a new test (test_stub)
                                         - Gate Integrity (always; four gate options)
```

If a senior engineer would apply the fix without discussion, AUTO-FIX; if reasonable
engineers could disagree, ASK. CRITICAL leans ASK; INFORMATIONAL leans AUTO-FIX.

Severity words: **blocker** = a test would fail, the app breaks, or data/secrets are lost
(CRITICAL). **should** = a real bug inside the intended case. **nit** = everything else; a
note, never a reason for another review pass.

---

## Suppressions - do NOT flag

Zero findings is a valid outcome.
- Harmless redundancy that aids readability.
- "Add a comment explaining this constant."
- "This assertion could be tighter" when it already covers the behavior.
- Consistency-only changes.
- Regex edge cases for inputs that are constrained in practice.
- Tests exercising several guards at once.
- Harmless no-ops.
- Anything already addressed in the diff.
- "Consider error handling" where an error boundary or caller already owns errors.
- "Function too long" for exhaustive switches, config objects, test tables, generated code.
- "Possible null dereference" when a type guard in scope narrows it.
- Hardcoded values in test fixtures, examples and docs.
- `Math.random()` for non-security uses (jitter, demo data).
