# Quickstart: validating the demo walkthrough

## Prerequisites

Bun ≥ 1.3, Rust stable, Playwright Chromium (`bunx playwright install chromium`).

## Automated checks

```sh
bunx tsc --noEmit && bun run test && bun run build
bunx tsc -p e2e/tsconfig.json && bun run e2e
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: all green. The e2e suite covers the scenarios below in Chromium at 1440×900 and at
the minimum window size of 960×640.

## Manual dry run (presenter)

Run `bun run tauri dev`, then:

1. **Start**: the start screen introduces Margaret and Dev and says the data is scripted. Every
   later screen shows "Demo — scripted data".
2. **US1**: Step through Margaret's interview line by line. Review the draft profile ("Draft — not
   published"), rename one competency, select **Publish my profile**. On Price, see $60–$90 with
   reasons; keep it or change it; confirm. Try min > max and see the explanation.
3. **US2**: The banner switches to "Now: Dev, the buyer". Step through Dev's conversation, confirm
   the brief (2 × 15 min, $50–$100). On Match, Margaret is shown with the matching competency and
   the overlap $60–$90; Harold and Lin are listed with why they did not match.
4. **US3**: Dev proposes 30 minutes at $75 (try $95 to see the warning). Margaret accepts. The
   session shows a date two days from today, a demo Meet link, $150 total and "Payment held until
   the session takes place". Mark the session as held → "Released to Margaret". Step through the
   debrief, approve the workflow, and see the engine: 1 workflow, 1 session, $150 earned.
5. **Navigation**: use the chapter list to jump to Match, then to Engine; select **Restart** and
   land on the start screen.

Time the run: it must take under 7 minutes (SC-001). Ask an observer to explain the match
(SC-006).

See [contracts/demo-actions.md](./contracts/demo-actions.md) for step gating and invariants, and
[data-model.md](./data-model.md) for seeded values.
