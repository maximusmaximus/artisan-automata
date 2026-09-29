# Usage with Grok products

Artisan-Automata is designed to be executed by Grok — in chat, on a schedule, or from an agent loop that can write GitHub files.

The pipeline repo stays stable. Each execution produces a **new application artifact**.

---

## 1. Grok Chat (interactive)

Best for: directing the aesthetic, choosing `core` vs `studio`, reviewing the concept before code.

1. Open [PROMPT.md](PROMPT.md).
2. Paste it as the first message, or say:

```text
Load the Artisan-Automata pipeline from https://github.com/maximusmaximus/artisan-automata
Read PROMPT.md, prompts/constraints.md, and ledger/prior-runs.md.
Execute one run.
```

3. Add operator overrides on the next lines:

```text
Profile: core
Target owner: maximusmaximus
Output: new public GitHub repository named after the app
Discovery window: last 7 days on X
Do not repeat mechanics listed in ledger/prior-runs.md
Venice: mcp
Venice allocation USD: 0.50
Venice model size: flash
Venice model tier: s
```

4. Let Grok finish discovery **before** it writes code. If the concept is wrong, stop it there.

5. Confirm the run log was appended to `ledger/`.

---

## 2. Grok Automations (scheduled)

Best for: a weekly new instrument, not a firehose.

Recommended cadence: **weekly**. Daily generation creates repo noise and mechanic repetition.

A ready-to-adapt prompt lives in [examples/grok-automation.md](examples/grok-automation.md).

Minimum automation prompt shape:

```text
You are executing the Artisan-Automata pipeline.
Source of truth: https://github.com/maximusmaximus/artisan-automata

1. Read PROMPT.md, prompts/constraints.md, prompts/novelty.md, ledger/prior-runs.md.
2. Resolve profile: studio if AUTH_GOOGLE_ID, AUTH_SECRET, and DATABASE_URL are available in the operator notes; otherwise core.
3. Discover recent experimental web art on X with X tools (no scraping).
4. Synthesize a novel art-making web app that does not repeat the ledger.
5. If venice-key-manager MCP is connected, mint a SUB_KEY for the app using docs/venice-mcp-subkey.md (project ArtisanAutomata, amount $0.50/DAY, tier s). Never mint ADMIN keys.
6. Create a new public GitHub repo under maximusmaximus named after the app slug.
7. Write the complete application into that repo.
8. Append ledger/prior-runs.md and add ledger/runs/<date>-<slug>.md back on artisan-automata.
9. Reply with: app name, repo URL, mechanic in one sentence, profile used, Venice allocation status, and leftover work.
```

Do not put OAuth client secrets or Venice tokens into the automation prompt. Point the generated app at env vars instead.

---

## 3. Grok agent loop / API

Best for: operators who already have GitHub connected and want files written, not pasted.

Contract:

1. Read this repo (do not clone generated apps back into it except under `apps/<slug>/` or as ledger entries).
2. Create or select a **target** repository for the app.
3. Write files with GitHub file tools (`create_repository`, `push_files`, `create_or_update_file`).
4. Never dump a 200-file codebase into the user-visible chat. Chat gets the brief + links.
5. If GitHub auth is missing, ask to connect it. Do not invent a zip of 40 files in markdown as the primary deliverable.

Suggested operator message:

```text
Run Artisan-Automata against my GitHub (maximusmaximus).
Profile core. Create the app as a new public repo.
Venice: mcp. Allocation USD 0.50. Model size flash.
When finished, update the pipeline ledger.
```

---

## 4. Local / hybrid (no cloud)

If you only want the instrument:

```text
Profile: core
Do not implement OAuth, Prisma, Drive, /explore, or admin.
Ship a complete Next.js app with the I-walkthrough, audio, fullscreen-on-gesture,
JSON serialize/deserialize, and URL-hash share.
```

State lives in `localStorage` and `#state=<base64url(json)>`.

---

## 5. What “done” means

A run is complete only when all of the following are true:

- [ ] App name and mechanic are not in `ledger/prior-runs.md`
- [ ] Target repo (or `apps/<slug>/`) contains a runnable Next.js app
- [ ] `README.md` in the app explains how to run it
- [ ] `.env.example` lists every required variable and none of the real secrets
- [ ] Walkthrough I-toggle works on every interactive control
- [ ] Audio starts only after a user gesture
- [ ] Creation state round-trips through the JSON schema
- [ ] `RUN.md` exists in the app
- [ ] Pipeline ledger was updated

`studio` additionally requires auth routes, Drive save, `/explore`, `/view/[slug]`, `/api/og`, and an allowlisted admin page.

---

## 6. Operator overrides

These flags may be added to any run:

| Flag | Effect |
| :--- | :--- |
| `Profile: core\|cloud\|studio` | Module set. |
| `Engine: webgl\|canvas2d\|svg` | Rendering backend hint. Default: pick from the concept. |
| `Audio: tone\|webaudio\|off` | `off` is allowed only if the operator says so. |
| `Target: new-repo\|apps/<slug>\|existing-repo` | Where files go. |
| `Visibility: public\|private` | Default public for generated apps unless told otherwise. |
| `Discovery: x\|ledger-only\|operator-concept` | Skip X if the operator already supplied the mechanic. |
| `Venice: mcp\|http\|off\|auto` | `mcp` uses Key Manager MCP sub-keys. `auto` tries MCP then HTTP then skip. |
| `Venice allocation USD: <n>` | Sub-key cap. Default `0.50` (VKM default is `0.25` if omitted). |
| `Venice model size: flash\|medium\|large` | Artisan size class. |
| `Venice model tier: xs\|s\|m\|l\|xl` | Key Manager ceiling. Default `s`. |

MCP sub-key recipe: [docs/venice-mcp-subkey.md](docs/venice-mcp-subkey.md).

---

## 7. Venice MCP sub-key

When `Venice: mcp` (or `auto` and MCP is connected):

1. Connect [venice-key-manager](https://github.com/maximusmaximus/venice-key-manager) (`python run.py --mcp`).
2. Follow [docs/venice-mcp-subkey.md](docs/venice-mcp-subkey.md):
   `venice_list_projects` / `venice_create_project` → `venice_create_external_key` → `venice_create_sub_key` → `venice_list_models` → `venice_test_inference`.
3. Write the sub-key token only to the generated app's `.env.local` as `VENICE_API_KEY` and `VENICE_INFERENCE_KEY`.
4. Record key id + USD + model in the ledger. Never commit the token.

If MCP is down, skip Venice and still ship Core.

---

## 8. What not to do

- Do not initialize a new copy of *this* pipeline repo every run.
- Do not scrape X, Twitter, or any site. Use Grok X tools.
- Do not request Google scopes broader than `drive.file`.
- Do not grant admin to the first login.
- Do not call `requestFullscreen()` on page load.
- Do not paste OAuth secrets into source, README, or the ledger.
- Do not clone an existing CodePen / shadertoy / X demo and rename it.
- Do not mint Venice `ADMIN` keys for generated apps.
- Do not copy `VENICE_ADMIN_KEY` into an app repo.
