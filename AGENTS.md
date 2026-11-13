# AGENTS.md

Working rules for everyone who changes this repository, people and coding agents alike.
`CLAUDE.md` imports this file. The principles behind these rules are in
[the constitution](.specify/memory/constitution.md); if the two disagree, the constitution wins.

Several rules below are adapted from the house rules in
[storytold/craft-contrib](https://github.com/storytold/craft-contrib/blob/main/standards/house-rules-core.md).

## How to work

1. **A person is accountable.** Whoever runs an agent answers for what it opens.
2. **Verify, don't guess.** Open a function, type or token's definition before using it. Confirm
   the cause of a bug in the code, even when someone names a location.
3. **Keep changes narrow and tested.** Change what the task describes. A bug fix comes with a test
   that fails without it.
4. **Review the diff before opening a pull request.** Every identifier exists as used, nothing
   unrelated changed, and the description is true.
5. **Report only what ran.** Say what you tested and what you could not run. Never describe a
   check as passing unless you saw it pass.
6. **`main` changes through a pull request.** Branch first. CI must be green before merge.
7. **Stop and ask only about:** licensing, publishing or deploying somewhere new, releases,
   secrets, spending money, destructive git (force-push, history rewrite, deleting branches), and
   anything else that is hard to undo. Otherwise keep working.
8. **Keep secrets and personal details out** of the repository, logs and requests to outside
   services.
9. **Guards say why.** A test, lint rule or CI gate that looks removable says what it prevents.
   Read that before changing it, and do not weaken a gate to make a change pass.
10. **Instructions must be readable by everyone.** Nothing here may depend on one person's
    machine. Machine-local notes go in `CLAUDE.local.md`, which is gitignored.

## Product rules that code must respect

These are constitution principles in the form you will meet them while coding.

- **Older adults first.** No text below 16px, primary controls at least 56px tall, visible focus,
  never colour alone. Use the tokens in `src/ui/tokens.css`; do not hard-code sizes or colours.
- **People decide, agents propose.** Publishing, accepting, booking and paying are separate,
  explicit human actions. Every agent suggestion shows its reason and can be edited.
- **Honest by default.** Scripted, simulated, modelled and estimated things are labelled where
  they appear. Nothing unconnected is presented as live.
- **Simple until proven otherwise.** No new dependency, backend or network call without a spec
  that needs it.
- **Owned and attributed.** A new asset gets a line in `ATTRIBUTION.md` in the same change.

## Commands

Run from the repository root. Bun is the package manager.

| Task | Command |
| --- | --- |
| Install | `bun install` |
| App in a browser | `bun run dev` |
| Desktop app | `bun run tauri dev` |
| Typecheck | `bunx tsc --noEmit` and `bunx tsc -p e2e/tsconfig.json` |
| Unit tests | `bun run test` |
| End-to-end tests | `bun run e2e` |
| App build (Tauri reads `dist/`) | `bun run build` |
| Website build (`dist/` plus `dist/demo/`) | `bun run build:site` |
| Rust checks | `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, all in `src-tauri/` |
| Licence and advisory check | `cargo deny check` in `src-tauri/` |

`bun run build` and `bun run build:site` both write `dist/` and each clears the other's output.
Build the one you are about to serve or test.

Done means all of the above pass. `/gstack-verify` runs the full set in a fix loop.

## Where things are

| Path | What it is |
| --- | --- |
| `src/demo/` | The walkthrough app: `domain/` is pure logic, `script/` the scripted story, `state/` the reducer, `screens/` the UI, `live/` the optional Codex agent. |
| `src-tauri/` | Rust shell and native commands. |
| `e2e/` | Playwright journeys, layout and accessibility checks, and the Tauri IPC stub. |
| `site/` | The website: landing page, `simulator/` and `costs/`. Plain HTML, CSS and JS modules. |
| `specs/` | Spec Kit artifacts, one folder per app feature. |
| `scripts/` | Repository tooling, such as the AI usage counter for the cost ledger. |

## Boundaries

- **App features follow Spec Kit** (`/speckit-specify` through `/speckit-implement`). Website
  pages do not need a spec, but their pull request says what the page is for and how it was
  checked.
- **Port 1420 belongs to `tauri dev`.** The e2e suite uses 1493 for that reason.
- **Versions move together** in `package.json`, `src-tauri/tauri.conf.json` and
  `src-tauri/Cargo.toml`. A unit test checks this.
- **The site build skips `*.test.js`** so tests can sit beside the code they test in `site/`.
- **Recording a cost** means adding a line to `site/costs/costs.json`. Its test enforces that
  every line has an explanation and every payment a source.
- **Cloudflare Pages deploys `main`** to agely.dev and builds a preview for every pull request.
  Merging is publishing.
