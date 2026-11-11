# Live agent setup (no API key)

The walkthrough's three conversations (Margaret's interview, Dev's brief chat, Margaret's debrief)
can be generated **live** instead of scripted. The app uses the **Codex CLI** already signed in on
your computer, with your ChatGPT account, so there is **no OpenAI API key** to create or store.

When the live agent is ready it switches on by itself. When it isn't, the scripted demo runs as
before, and the start screen tells you what's missing.

## Setup (about 3 minutes)

1. **Install Codex** (needs Node.js):

   ```sh
   npm install -g @openai/codex
   ```

2. **Sign in with ChatGPT**:

   ```sh
   codex login
   ```

   Pick "Sign in with ChatGPT" in the browser window that opens. Check with `codex login status`.
   It should say `Logged in using ChatGPT`.

3. **Run Agely**:

   ```sh
   bun install
   bun run tauri dev
   ```

   The start screen shows **"Live agent: checking…"**, then **"Live agent: ready"** with the
   model it found. The first check can take up to a minute while it finds a model your plan allows.

That's it. Start the walkthrough: the agent asks real questions, and every turn offers three
suggested replies. Pick one, or type your own.

## Choosing the model

ChatGPT plans allow different models in Codex. If you don't choose one, Agely first tries the
`model` set in your own Codex config (`~/.codex/config.toml`), then `gpt-5.4-mini`, `gpt-5.5` and
`codex-auto-review`, and uses the first that answers. Turns use **low** reasoning effort to stay
around 10 seconds; set `AGELY_CODEX_EFFORT=medium` (or `minimal` / `high`) to change it.

To pick one yourself:

```sh
AGELY_CODEX_MODEL=gpt-5.5 bun run tauri dev
```

If Codex is installed somewhere unusual, point Agely at it:

```sh
AGELY_CODEX_BIN=/path/to/codex bun run tauri dev
```

## What it sends, and what it can touch

- **Sent to OpenAI** through your signed-in account: the conversation so far, plus the
  fictional persona background (Margaret or Dev). Nothing else from your computer.
- Each turn runs `codex exec` in an **empty temporary folder** that is deleted afterwards. It runs
  with:
  - a read-only sandbox;
  - your personal Codex config and rules ignored;
  - apps, browser and computer-use turned off;
  - no saved session.

  The agent is told not to run commands or read files.
- Usage counts against your ChatGPT plan, like using Codex yourself.

## Troubleshooting

| Start screen says | What to do |
|-------------------|-----------|
| *Codex is not installed* | Step 1, then **Check again**. |
| *Codex is installed but not signed in* | `codex login`, then **Check again**. |
| *Your ChatGPT plan doesn't allow these models* | Set `AGELY_CODEX_MODEL` to a model your plan allows, restart the app, then **Check again**. |
| *The live agent check failed* | Check your internet connection, then **Check again**. |
| *Off in the browser preview* | The live agent only runs in the desktop app (`bun run tauri dev`), not `bun run dev`. |

If a turn fails or takes over 60 seconds during a demo, choose **Try again** or **Use the scripted
conversation**. Either way the demo carries on.

## Turning it off

Select **Turn live agent off** on the start screen. To keep it off for good, uninstall Codex or
run with `AGELY_CODEX_BIN=/nonexistent`.

## For developers

- Rust side: `src-tauri/src/agent/` (`agent_status`, `agent_turn` commands).
- Frontend: `src/demo/live/` (agent briefs per conversation, state, UI).
- Spec: `specs/002-live-codex-agent/`.
- To run against real Codex:

  ```sh
  cargo test --manifest-path src-tauri/Cargo.toml -- --ignored --nocapture
  ```

- An API-key provider can be added later behind the same two commands.
