# Artisan-Automata

**Reusable Grok pipeline for generating novel, production-ready experimental art-making web applications.**

This repository is the *pipeline*, not a generated app. Each Grok run reads this spec, invents a new interactive mechanic, and writes a separate Next.js application. Runs are designed to be triggered from Grok Chat, Grok Automations, or any Grok product that can follow a system prompt and write GitHub files.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

| | |
| :--- | :--- |
| **Status** | Active |
| **Owner** | [maximusmaximus](https://github.com/maximusmaximus) |
| **Trigger** | On demand, or scheduled via Grok Automations |
| **Output** | A new art-making web app (own repo or `apps/<slug>/`) |

---

## What you get each run

A *different* interactive art tool with:

- A one- or two-word original name (`AuraCanvas`, `Synapse`, `Lumina`)
- A unique generative mechanic (not a demo clone)
- Next.js App Router + React + TypeScript + Tailwind CSS
- Viewport-agnostic layout, touch + pointer, DPR-aware canvas/WebGL
- Web Audio / Tone.js reactive sound
- Fullscreen on user gesture (never on page load)
- The global top-left **I** walkthrough and contextual `i` badges
- JSON serialization of the creation state
- Shareable slugs + Open Graph previews when the studio profile is enabled

## Profiles

| Profile | Ships |
| :--- | :--- |
| `core` | Local sandbox. State in `localStorage` + URL hash. No OAuth required. |
| `cloud` | Core + Google / X login + Google Drive (`drive.file`) saves. |
| `studio` | Cloud + `/explore` community index + admin allowlist + dynamic OG images. |

Default: `studio` if the required secrets exist, otherwise **degrade to `core` and still ship**. Do not fail a run because Drive is unwired.

Admin is an **allowlist** (`ADMIN_USER_IDS` / `ADMIN_EMAILS`). The first person to log in is not an admin.

## Quick start with Grok

1. Open this repo and copy [`PROMPT.md`](PROMPT.md).
2. Paste it into Grok (or point a Grok Automation at it).
3. Set `PIPELINE_PROFILE` and a target GitHub repo.
4. Let Grok discover a mechanic from X, name the app, and write the codebase into the target — not into this pipeline repo.
5. Append a run log under [`ledger/runs/`](ledger/README.md) so the next cycle stays novel.

Full recipes: [`USAGE.md`](USAGE.md).

## Repository map

```
PROMPT.md                 paste-ready master directive
USAGE.md                  Chat / Automations / API recipes
prompts/                  phase specs loaded by the master prompt
schemas/                  creation-state JSON Schema + Prisma example
templates/                Auth, Drive, walkthrough, OG starters
ledger/                   novelty memory across runs
docs/                     architecture, modules, security
apps/                     optional landing pad for generated apps
```

## Hard rules

- Discover with Grok X tools. Never scrape.
- Google Drive scope is `drive.file` only.
- Fullscreen only after a user gesture.
- Do not overwrite this pipeline repo with a generated app.
- Do not dump a novel-length codebase into chat. Write files.

See [`CODE_OF_USE.md`](CODE_OF_USE.md) and [`SECURITY.md`](SECURITY.md).

## License

MIT © 2026 Max Infeld. Generated apps should keep third-party library licenses intact.
