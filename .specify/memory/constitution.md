# Agely Constitution

## Core Principles

### I. Older Adults First
Agely is built for people over 65 before anyone else.
- The expert MUST never be required to fill in a form; every expert-side input MUST be reachable
  by talking to an agent (voice), with typing offered only as an alternative.
- Text MUST NOT render below 16px (`--text-xs`); primary controls MUST be at least 56px tall
  (`--control-h`); pinch zoom MUST NOT be disabled.
- Copy MUST use plain language, one decision per screen, and visible keyboard focus.
- Meaning MUST NOT be carried by colour or animation alone.

Rationale: almost no technology is designed for older people; Agely's supply side is them.

### II. People Decide, Agents Propose
Agents draft, suggest, match, explain and prepare. Humans confirm.
- Agents MUST NOT publish a profile, accept a match, book a session, or move money on anyone's
  behalf. Each of those MUST be an explicit, separately labelled human action.
- Every agent suggestion (skill profile, price range, match) MUST show why it was suggested and
  MUST be editable before it is confirmed.

Rationale: trust from older experts and buyers depends on staying in control.

### III. Honest by Default
- Scripted or simulated data MUST be visibly labelled as a demo wherever it appears.
- Integrations that are not connected (Stripe, Google Meet/Zoom, Supabase, voice agents) MUST
  NOT be presented as live; mocks MUST sit behind an interface that a real adapter can replace.
- Agely MUST NOT offer legal, medical or financial advice; briefs in those domains MUST be
  declined with a clear explanation.
- Identity and credentials are self-declared at launch and MUST be shown as such.

Rationale: the product's value rests on credible expertise and credible claims.

### IV. Test-First, Verified Before Done (NON-NEGOTIABLE)
- Domain logic (matching, price-range overlap, flow state) MUST have unit tests written before
  or with the implementation, and they MUST be seen failing first.
- Each user-facing flow MUST have at least one Playwright journey running against the Tauri
  IPC stub.
- Work is done only when `tsc`, Vitest, the production build, Playwright, `cargo fmt`,
  `cargo clippy -D warnings` and `cargo test` all pass.

Rationale: a demo that breaks on stage costs more than the time tests take.

### V. Simple Until Proven Otherwise
- Prefer pure TypeScript functions and React state over new dependencies or services.
- No backend, database or network call is added until a spec requires it.
- `src/ui/tokens.css` is the single source of visual truth; components MUST use its tokens.

Rationale: a prototype must stay easy to change while the product is found.

## Product & Technical Constraints

- Desktop app: Tauri 2 (Rust shell) + React 19 + TypeScript (strict) + Vite, managed with Bun.
- Target users: buyers in the United States; experts from any country.
- Future integrations (out of scope until specified): Stripe for held payments, Google Meet or
  Zoom for sessions, Supabase for data, a voice agent for interviews.
- Sessions are sold in 15-minute units; prices are expressed per 15 minutes in USD.
- Headline success metric: dollars earned by people over 65.

## Development Workflow

- Every feature follows Spec Kit: specify → clarify → plan → tasks → analyze → implement.
  Artifacts live in `specs/<feature>/`.
- Work happens on a feature branch and lands through a pull request. CI (`ci.yml`) MUST be
  green before merge; reviewer approval is not required for this repository.
- Versions in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` move in
  lockstep.

## Governance

This constitution supersedes other practices in this repository. Amendments are made through a
pull request that updates this file, states the version bump and its reason, and updates any
affected specs or plans. Versioning follows semantic versioning: MAJOR for removed or redefined
principles, MINOR for new principles or sections, PATCH for clarifications. Every plan MUST
include a Constitution Check against the principles above, and any justified violation MUST be
recorded in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-11-11 | **Last Amended**: 2026-11-11
