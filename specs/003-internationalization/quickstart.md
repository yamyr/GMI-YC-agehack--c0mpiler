# Quickstart

1. Run `bun run dev` and open the app. Choose a language by its native name. Confirm restart, then follow the story. Cancel a second change and check that edits remain.
2. Reload and verify preference and document language. Try `?lang=ja`, unsupported query values, blocked storage and browser regional language preferences.
3. Run `bun scripts/i18n-check.mjs` for source/catalog coverage and interpolation parity.
4. Run `bun run test`, both TypeScript checks, `bun run build`, and `bun run e2e`.
5. Run cargo fmt/clippy/test/deny in src-tauri, then `bun run check:site`. Inspect site desktop/phone, long German/Finnish text and CJK/Cyrillic rendering. Restore app dist with `bun run build` before Tauri use.
6. Inspect native prompt unit tests for every response language. A real authenticated Codex conversation is optional and incurs usage; do not run it for verification without authorization.

Translations are model-generated drafts, not certified language review. The English video and unmodified source evidence are labelled/preserved. The advice guard recognizes representative keywords only.
