# Contract: Live agent Tauri commands

## `agent_status`

```ts
invoke<AgentStatus>("agent_status", { recheck: boolean })
```

- Cached after the first successful check; `recheck: true` runs it again (FR-003).
- Steps: locate binary → `codex login status` → model probe (`AGELY_CODEX_MODEL`, else candidates
  `gpt-5.4-mini`, `gpt-5.5`, `codex-auto-review`) with "Reply with the single word OK."
- Never throws for expected states; returns `state` + `detail` + `fix`.

| state | detail (example) | fix |
|-------|------------------|-----|
| ready | "Live agent ready (gpt-5.4-mini)." | null |
| not_installed | "Codex is not installed on this computer." | "npm install -g @openai/codex" |
| not_signed_in | "Codex is installed but not signed in." | "codex login" |
| model_unavailable | "Your ChatGPT plan doesn't allow model X in Codex." | "Set AGELY_CODEX_MODEL to a model your plan allows, then Check again." |
| error | "The readiness check failed: …" | "Check your internet connection, then Check again." |

## `agent_turn`

```ts
invoke<AgentTurn>("agent_turn", {
  request: {
    brief: AgentBrief,
    transcript: TranscriptLine[],   // oldest first; may be empty for the opening turn
  },
})
```

- Rejects with `AgentError` (`not_ready` if status isn't ready, `timeout` after 60 s, `failed` on a
  non-zero exit, `malformed` if the output fails validation).
- Runs: `codex exec --ignore-user-config --ignore-rules --skip-git-repo-check --ephemeral
  --sandbox read-only -C <temp> -m <model> --disable apps --disable browser_use
  --disable computer_use --output-schema <temp>/schema.json -o <temp>/out.json <prompt>`
  with stdin closed; the temp dir is removed afterwards.

## Output schema (sent to Codex)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["message", "options", "done"],
  "properties": {
    "message": { "type": "string" },
    "options": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 3 },
    "done": { "type": "boolean" }
  }
}
```

## Prompt rules (built in Rust, tested)

The prompt states: the agent role and goal; the persona background; that this is a demo for older
adults (short, warm, plain sentences, one question at a time); that options are three different
short replies written as `replyAs` in first person (≤ 160 chars); no legal, medical or financial
advice; never claim to publish, book, accept or pay; do not run commands or read files; set `done`
when the goal is met or on the last allowed turn and then close politely; the transcript so far.
