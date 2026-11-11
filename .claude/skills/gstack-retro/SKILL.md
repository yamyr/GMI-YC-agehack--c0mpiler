---
name: gstack-retro
description: Engineering retrospective over a time window (default 7 days) from git history and merged PRs - shipping velocity, commit mix, hotspots, test ratio, per-contributor praise and growth, 3 things to improve. Use when the user asks for a retro or weekly review. Adapted from gstack /retro.
---

<!-- Adapted from garrytan/gstack retro/SKILL.md + sections/report-format.md @ f0cd9f8c (MIT).
     Removed: gstack-retro-metrics binary (metrics are computed with plain git below),
     learnings, telemetry, factory scorecard, global cross-tool mode, eureka/skill-usage
     logs, shortcut-debt ledger. Snapshots are saved only if the user agrees. -->

# /gstack-retro: engineering retrospective

## Arguments

`/gstack-retro` (7d) | `24h` | `14d` | `30d` | `compare [window]`. Anything else: print this
usage and stop.

## Step 0: Window

Compute "today" from the session's current-date context, not from `date`. For `d`/`w`
windows use an absolute local-midnight start: `--since "<YYYY-MM-DD>T00:00:00"`. For `h`
use `--since "N hours ago"`. Report times in local timezone (do not set `TZ`).
`compare` also computes the prior window of the same length (`--since <prior start>
--until <current start>`).

`git fetch origin main --quiet || echo "RETRO_FETCH: failed"`. Analyze `origin/main`
(fall back to `main`, and say which ref was used). If the newest commit on the ref is older
than the window start and the fetch succeeded, stop and say the window is empty / date may be
wrong.

## Step 1: Gather metrics (plain git)

```bash
REF=origin/main; SINCE="<since>"
git log $REF --since="$SINCE" --no-merges --pretty='COMMIT|%h|%an|%ad|%s' --date=format-local:'%Y-%m-%d %H:%M' --shortstat
git log $REF --since="$SINCE" --merges --oneline | wc -l
git log $REF --since="$SINCE" --no-merges --name-only --pretty=format: | grep -v '^$' | sort | uniq -c | sort -rn | head -10
git log $REF --since="$SINCE" --no-merges --numstat --pretty=format: -- '*.test.ts' '*.test.tsx' 'e2e/**' 'src-tauri/tests/**'
git log $REF --since="$SINCE" --pretty='%b' | grep -ci 'co-authored-by:.*noreply@anthropic.com'
gh pr list --state merged --base main --search "merged:>=<start-date>" --limit 200 --json number,title,mergedAt,author 2>/dev/null
```

Compute (show "unavailable", never invent values):
- Commits, contributors, merged PRs (from `gh`; else "PRs referenced" from `#NNN` in subjects).
- Insertions / deletions / net; test insertions and test ratio (test files = `*.test.ts(x)`,
  `e2e/**`, Rust `tests/` dirs; inline `#[cfg(test)]` cannot be separated - say so).
- Active days; sessions (45-minute gap between consecutive commits; deep 50+ min,
  medium 20-50, micro <20); peak hour histogram.
- Commit type mix from conventional prefixes; flag fix ratio > 50%.
- Commit size buckets: <100, 100-500, 500-1500, 1500+ changed lines.
- Hotspots: top 10 files; flag files changed 5+ times.
- Focus score: % of file changes in the busiest top-level dir (`src/`, `src-tauri/`, `e2e/`,
  `specs/`, ...).
- Ship of the week: biggest commit or PR, and why it matters.
- Streaks: consecutive days with commits, team and the current git user
  (`git config user.name` = "you").
- AI-assisted commits (Anthropic co-author trailers) as a separate metric, never a team member.
- Spec Kit progress: for each `specs/*/tasks.md`, count `- [X]` vs `- [ ]` now, and how many
  were ticked in the window (`git log -p --since ... -- specs/*/tasks.md`).

## Step 2: Report

First line, a tweetable summary:
`Week of <date>: N commits (K contributors), X LOC, Y% tests, Z PRs, peak: <hour> | Streak: Nd`

Then:

```
## Engineering Retro: <date range>
### Summary table            (features shipped first, then commits, PRs, LOC, test ratio, sessions)
### Contributor leaderboard  (You first; commits, +/-, top area)
### Time & session patterns  (histogram, deep/medium/micro, peak hours, late-night clusters)
### Shipping velocity        (commit mix, size distribution, fix chains on one subsystem)
### Code quality signals     (test ratio, hotspots/churn, CI health if `gh run list` works)
### Spec progress            (per feature: tasks done/total, ticked this window)
### Focus & ship of the week
### Streaks
### Your week                (personal deep-dive)
### Team                     (per teammate, skip if solo: 2-3 sentences, 1-2 specific praises
                              citing commits, 1 growth opportunity tied to data)
### 3 things to improve      (specific, actionable, each tied to evidence)
### 3 habits for next week
```

In `compare` mode add **Current vs prior period** with deltas
(`Test ratio: 22% -> 41% (+19pp)`).

Praise must cite commits; growth items must cite data. No generic praise, no invented numbers.

## Step 3: History (optional)

Ask whether to save a snapshot. If yes, write `docs/retros/<today>-<window>.json` with the
summary metrics, per-author rollup, tweetable line and the "3 things to improve" as
`recommendations: [{category, text}]`. On the next run, load the newest snapshot with the same
window and score each prior recommendation `addressed | partial | open` with evidence.
Never write the snapshot without the user's yes.
