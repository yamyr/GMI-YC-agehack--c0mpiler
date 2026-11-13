# Security

Agely is a prototype. It has no accounts, stores nothing on a server, and moves no money; the
demo's payments are simulated. The desktop app can run a local Codex CLI for its optional live
agent, and the website at agely.dev is static.

## Reporting a problem

Please report a vulnerability privately through
[GitHub's private vulnerability reporting](https://github.com/yamyr/agely/security/advisories/new),
not in a public issue. Say what you found, how to reproduce it, and what it would let someone do.

This is a small project with no security team, so there is no guaranteed response time. Reports
are read, and a confirmed problem is fixed on `main` and credited to the reporter if they want.

## What is checked automatically

- Rust dependencies are checked for known vulnerabilities and disallowed licences on every pull
  request (`cargo deny`, configured in `src-tauri/deny.toml`).
- Dependabot opens updates for JavaScript, Rust and GitHub Actions dependencies weekly, and
  security updates as they are published.
