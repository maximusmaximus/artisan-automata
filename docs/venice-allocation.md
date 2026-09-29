# Venice.ai allocation via venice-key-manager

Artisan-Automata does **not** hold a Venice admin key. Each pipeline run (and each generated app that needs model inference) **requests an allocation** from [venice-key-manager](https://github.com/maximusmaximus/venice-key-manager) and receives:

1. An **amount** — USD spend cap on a dedicated `INFERENCE` key (`daily_usd` + `EPOCH` | `MONTH` | `LIFETIME`)
2. A **model size** — a concrete Venice model id plus `context_length` picked from the manager's `/api/models` catalog

Source tooling: dashboard on port `8844`, MCP server (`run.py --mcp`), CLI (`run.py venice …`).

---

## What the pipeline asks for

| Request | Default | Env |
| :--- | :--- | :--- |
| Spend cap (USD) | `0.50` | `VENICE_ALLOCATION_USD` |
| Reset period | `EPOCH` | `VENICE_LIMIT_PERIOD` |
| Key type | `INFERENCE` only | — |
| Category | `ArtisanAutomata` | `VENICE_KEY_CATEGORY` |
| Model size tier | `flash` | `VENICE_MODEL_SIZE` = `flash` \| `medium` \| `large` |
| Manager base URL | `http://127.0.0.1:8844` | `VENICE_KEY_MANAGER_URL` |
| Pairing token | (required) | `VENICE_KEY_MANAGER_TOKEN` |

Never request `ADMIN` keys for generated apps. Never copy `VENICE_ADMIN_KEY` into an app repo.

---

## Manager endpoints used

Auth: header `X-Access-Token: <pairing token>` (or `Authorization: Bearer …`). Tokens are minted in the Key Manager dashboard / Telegram bot / `venice_create_batch_codes`.

```text
GET  /api/health
GET  /api/balance          remaining USD / DIEM / credits, next epoch
GET  /api/models           id, name, context_length, privacy, pricing, capabilities
POST /api/keys             mint INFERENCE key with consumptionLimits.usd
POST /api/inference/test   optional smoke test of the new key + model
```

Create-key body (matches Key Manager `KeyCreateRequest`):

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

`GET /api/models` returns `context_length`. The allocator picks one live id:

| Tier | Rule | Preferred ids if present |
| :--- | :--- | :--- |
| `flash` | id contains `flash` or `context_length <= 32768` | `deepseek-v4-flash`, `gemini-3-6-flash` |
| `medium` | `32768 < context_length < 128000` | first non-offline text model in that band |
| `large` | `context_length >= 128000` | first non-offline text model in that band |

If the preferred id is offline or missing, take the next matching model. Record both `VENICE_MODEL` and `VENICE_MODEL_CONTEXT_LENGTH`.

Operator may pin an exact id with `VENICE_MODEL` and skip size selection.

---

## When to allocate

Allocate **after** the app has a slug, **before** writing the generated app's `.env.example`.

Skip allocation (do not fail the run) when:

- `VENICE_KEY_MANAGER_URL` or `VENICE_KEY_MANAGER_TOKEN` is unset
- `/api/health` is unreachable
- account `balances.USD` is below the requested cap

Write the skip reason into `RUN.md`. The art app must still run without Venice (local engine only).

---

## What gets written where

**Pipeline ledger** (`ledger/runs/<date>-<slug>.md`) records only non-secret metadata:

- key id (not the secret)
- last 6 chars if the manager returns `last6Chars`
- allocation USD + period
- model id + context_length
- manager URL host (not the pairing token)

**Generated app** receives server-only env (never committed, never `NEXT_PUBLIC_`):

```text
VENICE_API_KEY=
VENICE_KEY_ID=
VENICE_MODEL=
VENICE_MODEL_CONTEXT_LENGTH=
VENICE_ALLOCATION_USD=
VENICE_LIMIT_PERIOD=
VENICE_BASE_URL=https://api.venice.ai/api/v1
```

Client components talk to a Next.js route such as `app/api/venice/complete/route.ts` that reads those vars. Do not put the inference key in the browser.

---

## MCP alternative

If Grok / Cursor is connected to the Key Manager MCP server instead of HTTP:

1. `venice_get_account_balance`
2. `venice_list_models` (filter by size / query `flash`)
3. `venice_create_key` with `description`, `daily_usd`, `limit_period`, `api_key_type=INFERENCE`, `category=ArtisanAutomata`
4. `venice_test_inference` with the chosen model

Same write-back rules. Still no admin keys in app repos.

---

## Implementation files in this repo

- [`templates/venice-allocate.ts`](../templates/venice-allocate.ts) — copy into generated apps as `src/lib/venice/allocate.ts` or run from the pipeline agent
- [`schemas/venice-allocation.schema.json`](../schemas/venice-allocation.schema.json)
- [`prompts/07-venice.md`](../prompts/07-venice.md)
