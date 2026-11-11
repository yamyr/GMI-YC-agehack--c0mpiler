# GBrain (agent memory)

[GBrain](https://github.com/garrytan/gbrain) (Garry Tan, MIT) is gstack's companion: a local "second
brain" that coding agents can `remember` into and `recall` from over MCP.

## How it is set up on the dev machine (2026-11-11)

Nothing GBrain-related is committed except this note. Each developer opts in on their own machine.

| Step | Command | Effect |
|------|---------|--------|
| 1 | Bun ≥ 1.4.4 (official installer) | GBrain's Bun floor; the repo/CI pin stays at 1.3.10 |
| 2 | `GBRAIN_NO_AUTOPILOT_INSTALL=1 bun install -g github:garrytan/gbrain#stable` | CLI v0.60.654.0 (`stable` tag `80369bf`); no autopilot daemon, no cron |
| 3 | `gbrain init --pglite --no-embedding` | Keyless local brain at `~/.gbrain/brain.pglite` (embedded Postgres, no server, no API keys) |
| 4 | `gbrain setup claude-code --scope project --no-capture --no-providers` | This folder only: MCP entry in `~/.claude.json`, `SessionStart`/`UserPromptSubmit` hooks in `.claude/settings.local.json`, brain-first block in `CLAUDE.local.md` (both git-ignored) |
| 5 | `gbrain import specs .specify/memory docs/tooling README.md --no-embed` | Seeds the brain with the specs, constitution and tooling notes |

Declined on purpose: transcript capture (`--capture`), paid providers/embeddings (`--providers`),
autopilot enrichment, user-scope wiring, and network exposure (`gbrain serve --http`, `mcp expose`).
Search is keyword-only until embeddings are enabled deliberately.

## Use

- In a new Claude Code session in this folder, `/mcp` should list `gbrain`.
- Save a durable decision: `gbrain remember "<fact>" --provenance <where it came from>`.
- Find it again: `gbrain recall --query "<words>"`.
- Re-seed after spec changes: `gbrain import specs --no-embed --allow-noncanonical-root`.

Memories are readable by every agent connected to the brain. Keep secrets and personal data out.

## Undo

```sh
gbrain setup claude-code --scope project --remove   # removes exactly what setup wrote
bun remove -g gbrain                                 # the CLI
rm -rf ~/.gbrain                                     # the brain itself (irreversible)
```
