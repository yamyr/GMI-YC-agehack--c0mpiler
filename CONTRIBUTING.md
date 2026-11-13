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
