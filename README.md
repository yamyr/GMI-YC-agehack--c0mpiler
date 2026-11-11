# Agely
15-min expert to create meaning for senior adults edging retirement or retired

Desktop app built on **Tauri 2** (Rust shell) + **React 19 / TypeScript / Vite 7**, using Bun.
Foundation ported from `yademy/elderwise-hbs` (tooling, design tokens, error boundary, CI).

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- Rust stable: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- macOS: Xcode Command Line Tools (`xcode-select --install`)
- Other platforms: see <https://tauri.app/start/prerequisites/>

## Develop

```sh
bun install
bun run tauri dev     # native window, Vite on :1420 with HMR
bun run dev           # browser-only preview (native calls degrade gracefully)
```

## Check

```sh
bunx tsc --noEmit     # typecheck
bun run test          # Vitest unit tests
bun run e2e           # Playwright (Chromium, stubbed Tauri IPC — see e2e/tauriStub.ts)
cargo fmt   --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml
```

## Build

```sh
bun run tauri build   # installers land in src-tauri/target/release/bundle/
```

## Layout

| Path | What |
| --- | --- |
| `src/` | React frontend. `ui/tokens.css` is the design source of truth; `lib/native.ts` wraps Tauri IPC. |
| `src-tauri/` | Rust shell. Commands live in `src/lib.rs`; permissions in `capabilities/default.json`. |
| `e2e/` | Playwright specs; add canned IPC responses to `tauriStub.ts` for each new command. |
| `.github/workflows/` | `ci.yml` (frontend, e2e, macOS Rust) and `fast-feedback.yml` (quick PR signal). |

Versions in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` must match — a unit test enforces it.
