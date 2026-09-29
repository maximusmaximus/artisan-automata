# MCP: create a Venice sub-key for Artisan-Automata

Source tooling: [venice-key-manager](https://github.com/maximusmaximus/venice-key-manager) MCP server (`python run.py --mcp` or `venice-key-manager mcp`).

This pipeline does **not** hold a Venice admin key. Grok / Cursor talks to the Key Manager MCP and **receives** a capped **sub-key** plus a **model size** for [artisan-automata](https://github.com/maximusmaximus/artisan-automata).

Default unless an admin overrides it: **$0.25 USD / project / day**. For a pipeline run we request **$0.50 / DAY** and model tier **`s`** (flash).

---

## Connect the MCP server

```json
{
  "mcpServers": {
    "venice-key-manager": {
      "command": "python",
      "args": ["/path/to/venice-key-manager/run.py", "--mcp"],
      "env": { "PYTHONUNBUFFERED": "1" }
    }
  }
}
```

The MCP process uses the Key Manager vault / `VENICE_ADMIN_KEY` on the **manager host**. That admin key never leaves the manager and never goes into this repo or a generated app.

---

## Size mapping

Artisan-Automata size flags map onto Key Manager tiers (`xs` … `xl`):

| Artisan size | VKM tier | Typical model |
| :--- | :--- | :--- |
| `flash` (default) | `s` | `deepseek-v4-flash` |
| `medium` | `m` | mid-context text model |
| `large` | `l` or `xl` | reasoning / 405B / E2EE |

Sub-keys inherit the parent project's `max_model_tier` ceiling. A project capped at `s` cannot mint an `xl` sub-key.

---

## Tool sequence (preferred)

Call these MCP tools in order. Skip the run's Venice step (do not fail Core) if any call is unavailable.

### 1. Treasury

```text
venice_get_account_balance
```

If `balances.USD` is below the requested cap, record `status: skipped` / `insufficient_balance` and ship the app without inference.

### 2. Project pool

```text
venice_list_projects
```

Reuse a project named `ArtisanAutomata` if it already exists. Otherwise:

```text
venice_create_project
  name: ArtisanAutomata
  description: Inference pool for https://github.com/maximusmaximus/artisan-automata
  daily_limit_usd: 2.00
  default_sub_key_daily_usd: 0.50
  max_model_tier: s
```

Keep the returned `project.id`.

### 3. Parent external key (once per app slug)

```text
venice_create_external_key
  project_id: <project.id>
  name: artisan-automata:<slug>
  daily_limit_usd: 0.50
  limit_period: DAY
  max_model_tier: s
  notes: parent key for artisan-automata generated app
```

Keep `key.token` (prefix `vkm_ext_`) in memory only.

### 4. Sub-key for this run

This is the allocation the generated app receives.

```text
venice_create_sub_key
  parent_key_or_token: <external key.token or pairing token>
  name: artisan-automata:<slug>
  amount_usd: 0.50
  period: DAY
  max_model_tier: s
  notes: pipeline run sub-key
```

Response (`status: success`, `sub_key`):

| Field | Use |
| :--- | :--- |
| `token` | `VENICE_API_KEY` and `VENICE_INFERENCE_KEY` (same value, server env only) |
| `id` | `VENICE_KEY_ID` |
| `daily_limit_usd` | `VENICE_ALLOCATION_USD` |
| `limit_period` | `VENICE_LIMIT_PERIOD` (`DAY` here) |
| `max_model_tier` | map back to artisan `VENICE_MODEL_SIZE` |
| `key_type` | must be `SUB_KEY` |

Token prefix is `vkm_sub_`. Never commit it. Never `NEXT_PUBLIC_`.

`parent_key_or_token` may also be a dashboard pairing code if no external parent exists yet.

### 5. Model size

```text
venice_list_models
  query: flash
```

Pick a live text model:

- `flash` / tier `s` — prefer `deepseek-v4-flash` or id containing `flash`
- else first non-offline text model whose `context_length` matches the artisan size table in [venice-allocation.md](venice-allocation.md)

Record `VENICE_MODEL` and `VENICE_MODEL_CONTEXT_LENGTH`.

### 6. Smoke test

```text
venice_test_inference
  prompt: Artisan-Automata <slug> allocation check. Reply with OK.
  model: <picked id>
  api_key: <sub_key.token>
```

Optional: `venice_get_gateway_info` if the generated app will call the Key Manager gateway instead of `https://api.venice.ai/api/v1`.

---

## Native-key fallback

If project / sub-key tools are missing (older Key Manager), mint a native Venice INFERENCE key:

```text
venice_create_key
  description: artisan-automata:<slug>
  daily_usd: 0.50
  limit_period: EPOCH
  api_key_type: INFERENCE
  category: ArtisanAutomata
```

Same write-back rules. Still no `ADMIN` keys in app repos.

---

## Write-back

**Generated app `.env.local`** (gitignored):

```text
VENICE_API_KEY=<sub_key.token>
VENICE_INFERENCE_KEY=<sub_key.token>
VENICE_KEY_ID=<sub_key.id>
VENICE_MODEL=<picked id>
VENICE_MODEL_SIZE=flash
VENICE_MODEL_CONTEXT_LENGTH=<n>
VENICE_ALLOCATION_USD=0.50
VENICE_LIMIT_PERIOD=DAY
VENICE_MODEL_TIER=s
VENICE_BASE_URL=https://api.venice.ai/api/v1
```

If `venice_get_gateway_info` returned a public gateway URL, set `VENICE_BASE_URL` to that `/v1` endpoint instead.

**Public receipt** (`ledger/runs/<date>-<slug>.venice.json`, schema in `schemas/venice-allocation.schema.json`):

- `keyId`, last 6 of the token, `amountUsd`, period, model id + context length, `manager.source: mcp`
- never `token`, never pairing code, never `VENICE_ADMIN_KEY`

---

## Forbidden

- `api_key_type: ADMIN` or copying `VENICE_ADMIN_KEY` into artisan-automata or a generated app
- Calling `api.venice.ai` from the browser with the sub-key
- Committing `vkm_sub_` / `vkm_ext_` tokens
- Failing the whole pipeline because MCP is offline — degrade to Core, no LLM assist
