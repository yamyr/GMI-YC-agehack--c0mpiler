# Changelog

## 0.1.0 — 2026-11-14

### Website

- Added the [marketplace try-out](https://agely.dev/app). In one browser you can try both roles, publish an expert profile, confirm a price, review a buyer brief, see why a match fits, book a session, and download a calendar invitation. Sign-in, meetings, and payments are simulated. The try-out keeps data in the current browser and sends no invitations or money.
- Extended English and 17 draft translations to marketplace screens. Improved language selection, localized price and duration entry, and recovery when the browser blocks storage. The simulator keeps its selected week when you change languages.
- Added a [releases page](https://agely.dev/releases/) with desktop downloads and version history.

### Desktop app

- Published the first Apple Silicon macOS installer. It includes the scripted Margaret and Dev walkthrough in English and 17 draft translations, with no account needed for the scripted experience.
- Kept optional live conversations through a locally installed and signed-in Codex CLI. This preview uses an ad hoc signature and Apple has not notarized it.

## 0.0.1 — Initial prototype

- Built the Tauri walkthrough for expert onboarding, pricing, a buyer brief, matching, booking, simulated earnings, and a reusable workflow. Added optional live Codex conversations with a scripted fallback.
- Launched the website with a demo video, a browser walkthrough, a market simulator, and a cost ledger that identifies estimates.
- Added English and 17 draft translations to the website and walkthrough. Added accessibility and browser checks, project governance, attribution, and the MIT licence.
- Used `0.0.1` as the source version. Desktop use was through a local build.
