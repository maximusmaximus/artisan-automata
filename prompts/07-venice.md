# Phase 7 — Venice inference allocation

Optional. Run after the app has a slug. Do not block Core shipping if the manager is offline.

Tooling: https://github.com/maximusmaximus/venice-key-manager
Preferred recipe: `docs/venice-mcp-subkey.md`
Spec: `docs/venice-allocation.md`
Client: `templates/venice-allocate.ts`

## Goal

Receive from Key Manager MCP:

- an **amount** — dedicated sub-key with a USD cap (`venice_create_sub_key`, default $0.25 / day)
- a **size model** — live catalog id + `context_length` for artisan `flash` | `medium` | `large` (VKM tiers `s` | `m` | `l`/`xl`)

## MCP steps (preferred)

1. `venice_get_account_balance`. If USD < requested cap, skip.
2. `venice_list_projects`. Reuse project `ArtisanAutomata`.
3. Else `venice_create_project` with `name=ArtisanAutomata`, `daily_limit_usd=2.00`, `default_sub_key_daily_usd=0.50`, `max_model_tier=s` (or `m` / `l` if the operator set a larger artisan size).
4. `venice_create_external_key` with `project_id`, `name=artisan-automata:<slug>`, `daily_limit_usd` (default `0.50`), `max_model_tier` matching the size map.
5. `venice_create_sub_key` with `parent_key_or_token=<external token>`, `name=artisan-automata:<slug>`, `amount_usd=0.50`, `period=DAY`, `max_model_tier=s`.
6. `venice_list_models` (`query=flash` or the pinned `VENICE_MODEL`). Record id + `context_length`.
7. `venice_test_inference` using the sub-key token and chosen model.
8. Write non-secret metadata to `ledger/runs/<date>-<slug>.venice.json`.
9. Put `VENICE_API_KEY` / `VENICE_INFERENCE_KEY` only in the generated app's local env. List empty names in that app's `.env.example`.
10. If the generated app uses Venice at runtime, add a **server** route `app/api/venice/complete/route.ts`. Never `NEXT_PUBLIC_VENICE_API_KEY`.

## HTTP / native-key fallback

If MCP project tools are missing:

- HTTP: `GET /api/health` → `/api/balance` → `/api/models` → `POST /api/keys` (`apiKeyType: INFERENCE`, `description: artisan-automata:<slug>`)
- MCP native: `venice_create_key` `api_key_type=INFERENCE` `category=ArtisanAutomata` `daily_usd=0.50` `limit_period=EPOCH`

## Size map

- `flash` → VKM `s` → prefer `deepseek-v4-flash`
- `medium` → VKM `m`
- `large` → VKM `l` or `xl`

## Forbidden

- Minting `ADMIN` keys for apps
- Committing the raw `apiKey`, `vkm_sub_` token, or pairing token
- Calling `api.venice.ai` from the browser with the allocated key
- Failing the whole pipeline run because Venice / MCP is down
