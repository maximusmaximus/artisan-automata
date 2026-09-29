# Venice.ai allocation via venice-key-manager

Artisan-Automata does **not** hold a Venice admin key. Each pipeline run (and each generated app that needs model inference) **requests an allocation** from [venice-key-manager](https://github.com/maximusmaximus/venice-key-manager) and receives:

1. An **amount** — USD spend cap on a dedicated sub-key (`amount_usd`, default $0.25 / day unless overridden)
2. A **model size** — a Venice model id plus `context_length` / Key Manager tier (`xs` … `xl`)

**Preferred path: MCP sub-key.** Full recipe: [venice-mcp-subkey.md](venice-mcp-subkey.md).

Source tooling: MCP server (`python run.py --mcp`), dashboard, CLI.

---

## What the pipeline asks for

| Request | Default | Env |
| :--- | :--- | :--- |
| Spend cap (USD) | `0.50` | `VENICE_ALLOCATION_USD` |
| Reset period | `DAY` (MCP sub-key) or `EPOCH` (native key) | `VENICE_LIMIT_PERIOD` |
| Key type | `SUB_KEY` or native `INFERENCE` | — |
| Project / category | `ArtisanAutomata` | `VENICE_KEY_CATEGORY` |
| Model size tier | `flash` → VKM `s` | `VENICE_MODEL_SIZE` = `flash` \| `medium` \| `large` |
| VKM model tier | `s` | `VENICE_MODEL_TIER` = `xs` \| `s` \| `m` \| `l` \| `xl` |
| Manager base URL | `http://127.0.0.1:8844` | `VENICE_KEY_MANAGER_URL` |
| Pairing token | (required for HTTP) | `VENICE_KEY_MANAGER_TOKEN` |

Never request `ADMIN` keys for generated apps. Never copy `VENICE_ADMIN_KEY` into an app repo.

---

## MCP sub-key (preferred)

Connect [venice-key-manager](https://github.com/maximusmaximus/venice-key-manager) as an MCP server, then:

1. `venice_get_account_balance` — skip if USD < requested cap
2. `venice_list_projects` — reuse project `ArtisanAutomata`
3. else `venice_create_project` `name=ArtisanAutomata` `daily_limit_usd=2.00` `default_sub_key_daily_usd=0.50` `max_model_tier=s`
4. `venice_create_external_key` `name=artisan-automata:<slug>` `daily_limit_usd=0.50` `max_model_tier=s`
5. `venice_create_sub_key` `parent_key_or_token=<external token>` `name=artisan-automata:<slug>` `amount_usd=0.50` `period=DAY` `max_model_tier=s`
6. `venice_list_models` `query=flash` — pick id + `context_length`
7. `venice_test_inference` with the sub-key token

`venice_create_sub_key` defaults to **$0.25 / DAY** when `amount_usd` is omitted. Always pass `0.50` for a pipeline run unless the operator sets a different cap.

Step-by-step arguments and write-back: [venice-mcp-subkey.md](venice-mcp-subkey.md).

---

## HTTP fallback

Auth: header `X-Access-Token: <pairing token>` (or `Authorization: Bearer …`). Tokens are minted in the Key Manager dashboard / Telegram bot / `venice_create_batch_codes`.

```text
GET  /api/health
GET  /api/balance
GET  /api/models
POST /api/keys             mint INFERENCE key with consumptionLimits.usd
POST /api/inference/test
```

Create-key body (native Key Manager `KeyCreateRequest`):

```json
{
  "description": "artisan-automata:<app-slug>",
  "apiKeyType": "INFERENCE",
  "daily_usd": 0.5,
  "limitPeriod": "EPOCH",
  "category": "ArtisanAutomata"
}
```

Response fields consumed: `apiKey`, `id`, `consumptionLimits`, `limitPeriod`.

---

## Model size mapping

`venice_list_models` / `GET /api/models` returns `context_length`. The allocator picks one live id:

| Artisan tier | VKM tier | Rule | Preferred ids if present |
| :--- | :--- | :--- | :--- |
| `flash` | `s` | id contains `flash` or `context_length <= 32768` | `deepseek-v4-flash`, `gemini-3-6-flash` |
| `medium` | `m` | `32768 < context_length < 128000` | first non-offline text model in that band |
| `large` | `l` / `xl` | `context_length >= 128000` | first non-offline text model in that band |

If the preferred id is offline or missing, take the next matching model. Record `VENICE_MODEL`, `VENICE_MODEL_CONTEXT_LENGTH`, and `VENICE_MODEL_TIER`.

Operator may pin an exact id with `VENICE_MODEL` and skip size selection.

---

## When to allocate

Allocate **after** the app has a slug, **before** writing the generated app's `.env.example`.

Skip allocation (do not fail the run) when:

- MCP tools are not connected and HTTP `VENICE_KEY_MANAGER_URL` / `VENICE_KEY_MANAGER_TOKEN` is unset
- `venice_get_account_balance` / `/api/health` is unreachable
- account `balances.USD` is below the requested cap

Write the skip reason into `RUN.md`. The art app must still run without Venice (local engine only).

---

## What gets written where

**Pipeline ledger** (`ledger/runs/<date>-<slug>.md` and optional `.venice.json`) records only non-secret metadata:

- key id (not the secret)
- last 6 chars if the manager returns `last6Chars` / token suffix
- allocation USD + period
- model id + context_length + VKM tier
- manager source (`mcp` | `http` | `cli`)

**Generated app** receives server-only env (never committed, never `NEXT_PUBLIC_`):

```text
VENICE_API_KEY=
VENICE_INFERENCE_KEY=
VENICE_KEY_ID=
VENICE_MODEL=
VENICE_MODEL_CONTEXT_LENGTH=
VENICE_MODEL_SIZE=
VENICE_MODEL_TIER=
VENICE_ALLOCATION_USD=
VENICE_LIMIT_PERIOD=
VENICE_BASE_URL=https://api.venice.ai/api/v1
```

`VENICE_API_KEY` and `VENICE_INFERENCE_KEY` are aliases for the same sub-key token. Client components talk to a Next.js route such as `app/api/venice/complete/route.ts` that reads those vars. Do not put the inference key in the browser.

---

## Native MCP fallback

If project / sub-key tools are missing:

1. `venice_get_account_balance`
2. `venice_list_models` (query `flash`)
3. `venice_create_key` with `description=artisan-automata:<slug>`, `daily_usd`, `limit_period=EPOCH`, `api_key_type=INFERENCE`, `category=ArtisanAutomata`
4. `venice_test_inference`

Same write-back rules. Still no admin keys in app repos.

---

## Implementation files in this repo

- [`docs/venice-mcp-subkey.md`](venice-mcp-subkey.md) — MCP sub-key recipe
- [`templates/venice-allocate.ts`](../templates/venice-allocate.ts) — HTTP allocator
- [`schemas/venice-allocation.schema.json`](../schemas/venice-allocation.schema.json)
- [`prompts/07-venice.md`](../prompts/07-venice.md)
