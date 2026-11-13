# Agely

**Experience shouldn't retire.**

▶ **[Watch the demo](https://agely.dev/)** on the Agely landing page (source in `site/`), or **[try it in your browser](https://agely.dev/demo/)**.

Agely is an expert network where older adults turn decades of experience into paid, 15-minute sessions. Our longer-term goal is an AI engine each expert owns: a growing collection of their approved questions, checks, and workflows.

This hackathon prototype follows Margaret, a retired procurement director, and Dev, a hardware founder, from their first conversations to a completed session and Margaret's first saved workflow.

## The problem

Retirement does not erase the judgment someone has built over a career. We want to give older adults a way to keep contributing and earning without having to build a website, write a sales profile, or navigate a complicated marketplace.

On the other side, a founder facing an unfamiliar decision may need a short conversation with someone who has handled that problem before.

## Our approach

An agent helps an expert describe what they know, draft a profile, and choose a price. A buyer describes a problem, reviews a brief, and sees why an expert fits. Sessions are priced in 15-minute units.

After a session, a debrief turns the expert's approach into a proposed workflow. The expert reviews it before adding it to their engine. The aim is to preserve their working knowledge while they remain in control of what gets shared.

People make the decisions. Agents propose profiles, prices, matches, and workflows; people confirm publication, booking, and approval.

## Try the demo

The walkthrough is available on `main`. It uses fictional people and scripted conversations, so you can explore the full story without accounts, API keys, or external services.

1. **Margaret onboards.** Margaret Okafor, 68, describes 34 years in procurement and supplier management. Review her draft profile, edit a competency, and publish it.
2. **Margaret sets her price.** Review the suggested $60–$90 per 15 minutes and its reasons, then confirm or change the range.
3. **Dev describes his problem.** Dev Patel is preparing for his first contract-manufacturing agreement. Review his brief and $50–$100 budget per 15 minutes.
4. **Agely explains the match.** See which of Margaret's competencies fit and where their price ranges overlap. Other experts appear with reasons they did not match.
5. **They agree on a session.** Dev proposes 30 minutes at $75 per 15 minutes, or $150 total. Margaret accepts, and the demo shows a booking and simulated payment hold.
6. **Margaret's engine grows.** Mark the session as held, walk through the debrief, and approve a reusable workflow. The engine shows one session, one workflow, and $150 in simulated earnings.

Use the chapter list to jump to any part of the story. **Back** preserves your progress, and **Restart** returns to the beginning.

The [presenter guide](specs/001-demo-walkthrough/quickstart.md) includes a full dry run and validation steps.

**Live agent (optional, no API key).** If the [Codex CLI](https://github.com/openai/codex) is installed and signed in with ChatGPT on the computer running the desktop app, the three conversations (Margaret's interview, Dev's brief chat and Margaret's debrief) are generated live. Each agent turn offers three suggested replies, or you can type your own. Setup takes three commands: `npm install -g @openai/codex`, `codex login`, `bun run tauri dev`. Without Codex the scripted conversations run as above. See [docs/live-agent.md](docs/live-agent.md).

## What works today

| Part | Prototype behavior |
| --- | --- |
| Expert onboarding | Scripted interview, editable profile, explicit publication, and configurable price range. |
| Buyer brief | Editable problem, session length, and budget, with confirmation before matching. |
| Matching | Client-side competency matching and price-overlap calculations, with explanations and no-match states. |
| Booking | Proposal validation, acceptance or decline, and a session summary. |
| Expert engine | Scripted debrief, workflow approval, and session and earnings summaries. |
| Navigation | Chapter jumps, back, restart, and validation of invalid prices and proposals. |
| Live agent (optional) | The three conversations can be generated live through the local Codex CLI, using its ChatGPT sign-in and no API key. Each turn offers three suggested replies, with retry and a scripted fallback. Drafts that follow stay scripted. |

Conversations stand in for a future voice interview; there is no microphone. Conversations are scripted unless the optional live agent is available, and the profile, brief and workflow drafts are always scripted. Payments, meeting links, and earnings are simulated; no money moves and no meeting is created. Identity and credentials are self-declared. Demo edits stay in memory and reset when the app restarts.

## Designed for older adults

The expert's main path uses a conversation with suggested replies. Typing is available as an alternative. Shared design tokens set a minimum text size of 16px and primary control height of 56px. The interface provides visible keyboard focus and names the person whose turn it is.

Drafts remain drafts until the person confirms them. Every match explains its reasoning, and scripted data stays visibly labelled. The demo also declines requests for legal, medical, or financial advice.

These principles are recorded in the [project constitution](.specify/memory/constitution.md).

## Built with

- Tauri 2 and Rust for the desktop shell and native commands.
- React 19, TypeScript, and Vite 7 for the interface and client-side domain logic.
- Bun for dependency management and scripts.
- Vitest for unit tests and Playwright for browser journeys at desktop and minimum window sizes.
- GitHub Actions for frontend, browser, workflow, and Rust checks.

The foundation was ported from `yademy/elderwise-hbs`.

## Run locally

Install [Bun](https://bun.sh). Version `1.3.10` matches `package.json` and CI.

```sh
git clone https://github.com/yamyr/GMI-YC-agehack--c0mpiler.git
cd GMI-YC-agehack--c0mpiler
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:1420` to run the walkthrough in your browser. Browser mode does not require the Rust toolchain.

For the native desktop window, install Rust stable through [rustup](https://rustup.rs) and the [Tauri platform prerequisites](https://tauri.app/start/prerequisites/). On macOS, install Xcode Command Line Tools with `xcode-select --install`. Then run:

```sh
bun run tauri dev
```

Run browser development and native development separately because both use port `1420`.

## Validate changes

Run the frontend checks and production build:

```sh
bunx tsc --noEmit
bun run test
bun run build
```

Install Chromium, typecheck the browser tests, and run them:

```sh
bunx playwright install chromium
bunx tsc -p e2e/tsconfig.json
bun run e2e
```

Playwright starts its own Vite server on port `1493` and uses [stubbed Tauri IPC](e2e/tauriStub.ts). To choose another port, run `E2E_PORT=1494 bun run e2e`. Port `1420` is reserved for development.

After `bun run build` creates `dist/`, run the Rust checks on a machine with the Tauri platform prerequisites:

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

[Full CI](.github/workflows/ci.yml) checks the frontend on Ubuntu and runs Chromium and Rust checks on macOS. [Fast feedback](.github/workflows/fast-feedback.yml) checks workflows, frontend types and unit tests, and Rust formatting. Wait for full CI to pass before merging.

## Build an installer

```sh
bun run tauri build
```

Tauri builds the frontend and native app, then writes platform-specific bundles to `src-tauri/target/release/bundle/`.

For a frontend-only production preview, run `bun run build` followed by `bun run preview`.

## Explore the repository

| Path | Purpose |
| --- | --- |
| `src/demo/` | Walkthrough screens, fictional personas, domain rules, state, and scripted services. |
| `src/ui/` | Shared design tokens and the React error boundary. |
| `src/lib/` | Tauri IPC wrapper and error handling. |
| `src-tauri/` | Rust shell, native commands, permissions, and desktop configuration. |
| `e2e/` | Playwright journeys, edge cases, layout checks, and the Tauri IPC stub. |
| `specs/001-demo-walkthrough/` | Demo specification, data model, contracts, tasks, and presenter guide. |
| `.specify/` | Spec Kit templates, scripts, and the project constitution. |
| `docs/tooling/` | Notes on the project's optional development tools. |
| `site/` | Static landing page with the demo video, served at agely.dev; the app is at `/demo/` (`bun run build:site`). |

Features follow Spec Kit: specify, clarify, plan, tasks, analyze, and implement. Use `src/ui/tokens.css` for shared visual values. Keep versions in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` in sync; a unit test checks them.

## What's next

The three conversations can already run live through the optional Codex agent. The next step is to generate the profile, brief and workflow drafts live as well, still behind human confirmation and with a scripted fallback. Voice input, real payments and calendars, persistent storage, and expert-owned AI workflows beyond the demo need further implementation and validation.

The outcome we want to measure is dollars earned by people over 65.
