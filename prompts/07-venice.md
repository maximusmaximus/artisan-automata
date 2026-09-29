# Phase 7 — Venice inference allocation

Optional. Run after the app has a slug. Do not block Core shipping if the manager is offline.

Tooling: https://github.com/maximusmaximus/venice-key-manager
Spec: `docs/venice-allocation.md`
Client: `templates/venice-allocate.ts`

## Goal

Receive from Key Manager:

- an **amount** — dedicated `INFERENCE` key with a USD cap
- a **size model** — live catalog id + `context_length` for `flash` | `medium` | `large`

## Steps

1. If `VENICE_KEY_MANAGER_URL` or `VENICE_KEY_MANAGER_TOKEN` is missing, skip and record `status: skipped`.
2. `GET /api/health`. On failure, skip.
3. `GET /api/balance`. If `balances.USD` < `VENICE_ALLOCATION_USD` (default `0.50`), skip with reason `insufficient_balance`.
4. `GET /api/models`. Select by `VENICE_MODEL` pin, else by `VENICE_MODEL_SIZE`:
   - `flash` — prefer `deepseek-v4-flash` / ids containing `flash` / `context_length <= 32768`
   - `medium` — `32768 < context_length < 128000`
   - `large` — `context_length >= 128000`
5. `POST /api/keys` with `apiKeyType: INFERENCE`, `description: artisan-automata:<slug>`, `daily_usd`, `limitPeriod`, `category: ArtisanAutomata`.
6. Optional `POST /api/inference/test` using the new key and chosen model.
7. Write non-secret metadata to `ledger/runs/<date>-<slug>.venice.json` validating `schemas/venice-allocation.schema.json`.
8. Put `VENICE_API_KEY` only in the generated app's local env (gitignore). List empty names in that app's `.env.example`.
9. If the generated app uses Venice at runtime, add a **server** route `app/api/venice/complete/route.ts`. Never `NEXT_PUBLIC_VENICE_API_KEY`.

## Forbidden

- Minting `ADMIN` keys for apps
- Committing the raw `apiKey` or pairing token
- Calling `api.venice.ai` from the browser with the allocated key
- Failing the whole pipeline run because Venice is down
