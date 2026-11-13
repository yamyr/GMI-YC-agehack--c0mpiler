# Contributing

Thanks for looking at Agely. It is a hackathon prototype of an expert network for older adults,
and contributions from people and from coding agents are both welcome on the same terms.

## Before you start

- Read [AGENTS.md](AGENTS.md). It has the working rules, the commands and a map of the
  repository, and it applies to everyone.
- The principles behind those rules are in [the constitution](.specify/memory/constitution.md).
  A change that breaks one needs to say so and explain why.

## Making a change

1. Branch from `main`. Changes reach `main` only through a pull request.
2. A change to the app (`src/`, `src-tauri/`) follows Spec Kit, with its artifacts in
   `specs/<feature>/`. A change to the website (`site/`) does not need a spec.
3. Run the checks in AGENTS.md. A bug fix comes with a test that fails without it.
4. In the pull request, say what changed, what you tested, and what you could not run.
5. If you add a font, image, video or other asset, add it to [ATTRIBUTION.md](ATTRIBUTION.md)
   in the same change. If you add a dependency, check its licence is permissive.

CI must be green before a merge. Merging to `main` publishes the website.

## Licence

By contributing you agree that your work is released under the [MIT License](LICENSE).

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

## Maintain translations

English source messages are the catalog keys. Add each new message to the relevant sorted
source inventory in `site/i18n/messages/`, then add its draft translation to every file in
`site/i18n/catalogs/`. Keep numbered slots such as `{0}` unchanged; their order may change.
Run `bun scripts/i18n-check.mjs` to detect missing translations and lost slots.

Use complete sentences when interpolating values. Render translations as text, never as HTML.
Keep domain IDs, user-written text, names, URLs and canonical ledger evidence separate from
translated labels. Format displayed values with the shared `site/i18n/core.js` helpers. Prices
stay in USD and a language choice does not change the time zone.

The current catalogs are model-generated drafts and need human language review. Missing or
malformed entries fall back to the English source. Keep the visible draft/fallback disclosure
until the language-review process changes. Update `ATTRIBUTION.md` when adding generated text.

The app asks before restarting the walkthrough in another language. A cancelled change must
preserve edits; a confirmed change must prevent pending replies from entering the new story.
Exercise those cases in `e2e/i18n.spec.ts` when changing locale state. Run the existing chapter
accessibility/layout checks and inspect long translations and CJK/Cyrillic glyphs in a browser.

The offline restricted-advice guard recognizes example keywords in the supported languages.
It is a demo rule, not a complete classifier. Add both positive business examples and negative
advice requests when extending it. Do not describe its keyword coverage as general safety.
