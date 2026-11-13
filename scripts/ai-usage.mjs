#!/usr/bin/env node
// Totals the AI tokens used to build Agely, from the session logs coding agents keep on the
// developer's machine, and prices them at public API list prices.
//
//   node scripts/ai-usage.mjs <claude-project-log-dir>... [--codex <codex-sessions-dir> --match <regex>]
//
// Claude Code logs live in ~/.claude/projects/<project>/ and Codex logs in ~/.codex/sessions/.
// The output is JSON for site/costs/costs.json. It contains token counts only: no prompts, paths
// or names. The dollar figure is what the tokens would cost on the pay-as-you-go API. Work done
// under a flat-rate subscription did not cost this much in cash, so the page shows it as an
// estimate, apart from money actually paid.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// US dollars per million tokens. Anthropic list prices as of 2026-11-03. Cache writes are billed
// at 1.25x input for the 5-minute cache and 2x input for the 1-hour cache.
const CLAUDE_PRICES = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

function* records(file) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // a partly written last line; skip it
    }
  }
}

function claudeUsage(dirs) {
  const seen = new Set();
  const models = {};
  const days = new Set();
  let sessions = 0;
  for (const file of dirs.flatMap((d) => walk(d))) {
    sessions++;
    for (const r of records(file)) {
      const u = r.message?.usage;
      if (r.type !== "assistant" || !u) continue;
      // A streamed reply is logged once per content block; count each API response once.
      const key = `${r.message.id}:${r.requestId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const model = r.message.model;
      if (!CLAUDE_PRICES[model]) continue;
      const m = (models[model] ??= { responses: 0, input: 0, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 });
      const write = u.cache_creation ?? {};
      const write1h = write.ephemeral_1h_input_tokens ?? 0;
      m.responses++;
      m.input += u.input_tokens ?? 0;
      m.output += u.output_tokens ?? 0;
      m.cacheWrite1h += write1h;
      m.cacheWrite5m += (u.cache_creation_input_tokens ?? 0) - write1h;
      m.cacheRead += u.cache_read_input_tokens ?? 0;
      if (r.timestamp) days.add(r.timestamp.slice(0, 10));
    }
  }
  let total = 0;
  for (const [model, m] of Object.entries(models)) {
    const p = CLAUDE_PRICES[model];
    m.listPriceUsd =
      Math.round(
        ((m.input * p.input + m.output * p.output + m.cacheWrite5m * p.input * 1.25 + m.cacheWrite1h * p.input * 2 + m.cacheRead * p.cacheRead) / 1e6) * 100,
      ) / 100;
    total += m.listPriceUsd;
  }
  return { sessionFiles: sessions, days: [...days].sort(), models, listPriceUsd: Math.round(total * 100) / 100 };
}

function codexUsage(dir, match) {
  const models = {};
  let sessions = 0;
  for (const file of walk(dir)) {
    const text = readFileSync(file, "utf8");
    if (match && !new RegExp(match).test(text.slice(0, 8000))) continue;
    sessions++;
    let last = null;
    let model = "unknown";
    for (const r of records(file)) {
      const p = r.payload ?? {};
      if (p.type === "token_count" && p.info?.total_token_usage) last = p.info.total_token_usage;
      if (r.type === "turn_context" && p.model) model = p.model;
    }
    if (!last) continue;
    const m = (models[model] ??= { sessions: 0, input: 0, cachedInput: 0, output: 0 });
    m.sessions++;
    // Codex reports cached tokens inside input_tokens; split them apart.
    m.input += last.input_tokens - last.cached_input_tokens;
    m.cachedInput += last.cached_input_tokens;
    m.output += last.output_tokens;
  }
  return { sessionFiles: sessions, models };
}

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const codexDir = flag("--codex");
const match = flag("--match");
const claudeDirs = args.filter((a, i) => !a.startsWith("--") && !["--codex", "--match"].includes(args[i - 1]));
if (claudeDirs.length === 0 && !codexDir) {
  console.error("usage: node scripts/ai-usage.mjs <claude-project-log-dir>... [--codex <dir> --match <text>]");
  process.exit(1);
}
console.log(
  JSON.stringify({ claudeCode: claudeDirs.length ? claudeUsage(claudeDirs) : null, codex: codexDir ? codexUsage(codexDir, match) : null }, null, 2),
);
