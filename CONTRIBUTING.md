# Contributing

This repo is the pipeline, not a generated art app.

## What belongs here

- Prompt and constraint edits that make Grok runs more reliable
- Schema changes that preserve backward compatibility (`schemaVersion`)
- Template fixes (walkthrough store, Drive client, OG route, Auth.js)
- Ledger process improvements
- Usage notes for new Grok products

## What does not belong here

- A finished art app (put it in its own repository, then add a ledger line)
- Real secrets
- Scrapers
- Broadening Google scopes

## How to change the prompt

1. Edit `PROMPT.md` and the relevant file under `prompts/`.
2. If you change required behavior, update `docs/modules.md` and `USAGE.md`.
3. If you change creation-state shape, bump `schemaVersion` in `schemas/creation-state.schema.json` and mention the migration in `docs/architecture.md`.
4. Open a pull request with the reason the last Grok run failed or drifted.

## Ledger hygiene

- One line in `ledger/prior-runs.md` per generated app.
- One file in `ledger/runs/` with sources and the mechanic id.
- No tokens, no emails, no Drive file contents.

## License

By contributing you agree the contribution is MIT-licensed, same as [LICENSE](LICENSE).
