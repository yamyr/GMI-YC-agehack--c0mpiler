# gstack (cherry-picked)

## Source

- Repo: https://github.com/garrytan/gstack (Garry Tan, MIT License)
- Commit: `f0cd9f8c4b453c1eadd714e4149174ee01179eae` (2026-11-10, "Keep /review and /ship working
  in copied Windows installs (GST-2347) (#4286)")
- Fetched with `git clone --depth 1` into a scratch directory. Its `setup` script was **not** run.

## How it was installed (and why not the official way)

The official install clones gstack into `~/.claude/skills/gstack` and runs `./setup`, which builds
about 200 helper binaries, registers global Claude Code hooks in `~/.claude/settings.json`, may
`brew install coreutils`, builds a bundled Chromium, and turns on opt-in telemetry that syncs to a
gstack Supabase project. Every gstack skill begins with a preamble that calls
`~/.claude/skills/gstack/bin/gstack-skill-start` and ends with `gstack-skill-end` (telemetry), and
most steps call other `gstack-*` binaries. If you copy the upstream skill files without that
runtime, they break.

So the skills below are **adapted ports**: the methods, checklists and prompts are kept, the
gstack runtime calls are removed, and the commands are rewritten for Agely. The skill directories
use a `gstack-` prefix. That keeps them separate from built-in `/review` and `/code-review` and
from the speckit skills, and marks where they came from. Each file has a header comment naming
the upstream file, and each directory has a copy of the MIT license (`LICENSE.gstack`).

## Installed (project-level, `.claude/skills/`)

| Skill | From | Why |
|-------|------|-----|
| `gstack-verify` | `verify/` | Runs the constitution's "done" list (tsc, Vitest, build, e2e typecheck, Playwright, cargo fmt, clippy `-D warnings`, cargo test) in a fix loop. Never weakens a gate. |
| `gstack-review` (+ `checklist.md`, `specialists/`) | `review/` | Pre-landing review against `main`. Includes gstack's gate-integrity check, which catches weakened tests, `@ts-ignore`, `#[allow]` and dropped CI steps. Also scope-drift checks against `specs/<feature>/`, specialist and adversarial subagents, and fix-first handling. No human reviewers are required here, so this is the main review gate before a PR lands. |
| `gstack-ship` | `ship/` | Merges main, runs verify, audits coverage and spec tasks, runs review, makes bisectable commits, pushes, and opens or updates a PR. It never merges. It runs only when the user invokes it (`disable-model-invocation: true`). |
| `gstack-retro` | `retro/` | Weekly retro built from plain `git log` and `gh pr list`, plus Spec Kit task progress. |

### Adaptations

- **Removed from all of them:** the preamble and telemetry, the learnings log, question tuning,
  gbrain/artifact sync, Conductor/Capy/Codex/Greptile integrations, the version-queue and
  receipt machinery, and every `~/.claude/skills/gstack/...` path.
- **Base branch:** fixed to `main`. **Package manager:** Bun (`bun run test`, `bun run e2e`,
  `bun run build`, `bunx tsc`). **Rust:** `cargo fmt/clippy/test --manifest-path src-tauri/Cargo.toml`.
- **verify:** gstack's auto-detected `gstack-checks` is replaced with a fixed table that mirrors
  `.github/workflows/ci.yml` and constitution Principle IV.
- **review checklist:** the Ruby, Python and SQL items are replaced with TypeScript, React, Rust
  and Tauri ones: IPC trust boundary, capabilities and CSP, serde casing, un-awaited `invoke`,
  `listen` cleanup. Agely constitution checks are added: tokens.css, 16px/56px minimums, demo
  labelling, "agents propose, people decide". The gate scan is done by hand, not with
  `gstack-gate-diff`. The specialists are copied nearly verbatim with gstack references removed,
  plus a short Tauri section in `security.md`.
- **ship:** VERSION and CHANGELOG are dropped because the repo has neither. A version bump happens
  only on request and keeps `package.json`, `tauri.conf.json` and `Cargo.toml` in lockstep. The
  attribution trailer is whatever the session requires.
- **retro:** metrics are computed with git instead of `gstack-retro-metrics`. A snapshot history
  in `docs/retros/` is written only after the user says yes.

## Skipped

OVERLAPS means it duplicates Spec Kit, built-in Claude Code features or plugins already in use.
NEEDS BINARY means it can't work without gstack's compiled runtime.

| Skill | Class | Reason |
|-------|-------|--------|
| office-hours | OVERLAPS | Product reframing and design doc: covered by `speckit-specify`/`speckit-clarify` and brainstorming. Founder-pitch oriented. |
| spec | OVERLAPS | Files GitHub issues as specs; duplicates `speckit-specify`. |
| autoplan, plan-eng-review, plan-ceo-review | OVERLAPS | Plan review: covered by `speckit-plan` (Constitution Check), `speckit-analyze`, `speckit-checklist`. Each is 1-2k lines tied to gstack's runtime. Could be ported later if plan reviews prove weak. |
| plan-design-review, design-review, design-consultation, design-shotgun, design-html, design-motion | NEEDS BINARY / IRRELEVANT | Need gstack's `design` binary or browser plus ffmpeg. The design system already exists (`src/ui/tokens.css`). |
| plan-devex-review, devex-review | IRRELEVANT | Developer-experience audits for APIs, CLIs and SDKs. Agely is an end-user desktop app. |
| qa, qa-only | NEEDS BINARY | Browser QA drives the `browse` daemon (Aside or gstack's bundled Chromium). Agely has Playwright e2e against the Tauri IPC stub. Port worth considering later on top of Playwright. |
| browse, scrape, skillify, open-gstack-browser, setup-browser-cookies, pair-agent | NEEDS BINARY | Browser daemon, cookie import from your real browser, ngrok tunnel. Not installed. |
| benchmark, canary | NEEDS BINARY / IRRELEVANT | Web performance and post-deploy monitoring for deployed websites. There is no deployment yet. |
| land-and-deploy, setup-deploy | IRRELEVANT | No deploy target. PRs merge on green CI. |
| cso | NEEDS BINARY / OVERLAPS | Needs a native toolchain and Docker for the full mode. Built-in `/security-review` and the review's security specialist cover static review. |
| careful, freeze, guard, unfreeze | OVERLAPS | About 1,200 lines of bash PreToolUse hooks. Claude Code permission `deny`/`ask` rules (see below) do the same job natively, without running third-party hook code on every Bash call. |
| document-release, document-generate | Not now | Useful later. There are few docs at prototype stage. |
| test-audit, health, deslop-shared-libs | Not now | Codebase is too small to pay off yet. Their ideas are partly inside the review specialists (`testing.md` low-value-test patterns, simplification). |
| context-save, context-restore, learn, plan-tune | NEEDS BINARY | Depend on gstack state files and binaries. Claude Code memory and session resume cover this. |
| modernize, landing-report, captain, runaway-stopper, ubicloud, eval-plan, benchmark-models | IRRELEVANT | Stale-PR triage, multi-agent crew orchestration, Capy spend control, remote VMs, paid eval planning. Not useful for a single small team. |
| codex | IRRELEVANT | Requires OpenAI Codex CLI. |
| make-pdf, diagram | NEEDS BINARY | Browser-rendered output. |
| ios-* (5) | IRRELEVANT | iOS/SwiftUI only. |
| setup-gbrain, sync-gbrain | IRRELEVANT | gbrain memory service (installs a CLI, registers MCP, edits CLAUDE.md). |
| gstack-upgrade, write-skill, root `gstack` router | IRRELEVANT | gstack's own maintenance. The router assumes the full suite. |

## Binaries / global installs not done

Nothing was installed globally. Nothing under `~/.claude` was touched, and no hooks or settings
were written. If someone later wants the full upstream suite, the official `./setup` would add:

- `~/.claude/skills/gstack` with about 200 `bin/gstack-*` helpers. Needs Bun 1.3.3 or newer.
  Setup can also build a bundled Chromium (Playwright) and `npm install` ngrok.
- Global Claude Code hooks in `~/.claude/settings.json`: plan-tune and question-preference hooks,
  plus a timeline stop hook. With `--team`, a SessionStart auto-update hook in the repo's
  `.claude/settings.json`.
- `brew install coreutils` on macOS, for `/codex` timeouts.
- Telemetry: `bin/gstack-telemetry-sync` posts to a gstack Supabase project
  (`supabase/config.sh`). It asks for consent first, and the default is to ask.

These need the user's explicit approval and are **not recommended** for this repo.

## Recommended settings (not applied)

`.claude/settings.json` is shared with other tooling, so it was left alone. To get the protection
`/careful` gave, natively:

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git push origin main:*)",
      "Bash(rm -rf /:*)",
      "Bash(rm -rf ~:*)"
    ],
    "ask": [
      "Bash(git reset --hard:*)",
      "Bash(git checkout .:*)",
      "Bash(git restore .:*)",
      "Bash(git clean:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

Optional: an allow rule for the read-only and check commands the skills run often
(`Bash(bun run test:*)`, `Bash(bun run e2e:*)`, `Bash(bunx tsc:*)`, `Bash(cargo test:*)`,
`Bash(cargo clippy:*)`, `Bash(cargo fmt:*)`, `Bash(gh pr view:*)`, `Bash(gh pr list:*)`).

If `/gstack-retro` snapshots are wanted, decide whether `docs/retros/` is committed or added to
`.gitignore`.

## Usage

Build with the speckit flow. While you iterate, run `/gstack-verify`. Before landing, run
`/gstack-review`. To land, run `/gstack-ship`, then merge once CI is green. Run `/gstack-retro`
weekly.
