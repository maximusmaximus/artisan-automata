/**
 * Allocate a capped Venice.ai INFERENCE key + sized model from venice-key-manager.
 * Copy into a generated app as src/lib/venice/allocate.ts or run from the pipeline agent.
 *
 * Auth: pairing token from the Key Manager dashboard / Telegram bot.
 * Never logs apiKey. Never requests ADMIN keys.
 */

export type ModelSizeTier = "flash" | "medium" | "large";
export type LimitPeriod = "EPOCH" | "MONTH" | "LIFETIME";
export type AllocationStatus = "allocated" | "skipped" | "failed";

export interface VeniceModel {
  id: string;
  name?: string;
  context_length?: number;
  privacy?: string;
  type?: string;
  offline?: boolean;
}

export interface AllocationRequest {
  appSlug: string;
  amountUsd?: number;
  limitPeriod?: LimitPeriod;
  sizeTier?: ModelSizeTier;
  pinnedModelId?: string;
  category?: string;
  managerUrl?: string;
  accessToken?: string;
  smokeTest?: boolean;
}

export interface AllocationRecord {
  schemaVersion: "1.0.0";
  appSlug: string;
  allocatedAt: string;
  status: AllocationStatus;
  skipReason?: string;
  amountUsd: number;
  limitPeriod: LimitPeriod;
  keyType: "INFERENCE";
  category: string;
  keyId?: string;
  keyLast6?: string;
  model: {
    id: string;
    name?: string;
    sizeTier: ModelSizeTier;
    contextLength: number;
    privacy?: string;
  };
  manager?: { baseUrl: string; source: "http" };
  account?: { usdRemaining?: number; diemRemaining?: number; nextEpochBegins?: string };
  /** Present only in memory / local env — strip before writing ledger files. */
  apiKey?: string;
}

const DEFAULT_FLASH_IDS = ["deepseek-v4-flash", "gemini-3-6-flash"];

function env(name: string, fallback = ""): string {
  if (typeof process === "undefined" || !process.env) return fallback;
  return (process.env[name] ?? fallback).trim();
}

function authHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Access-Token": token,
    Authorization: `Bearer ${token}`,
  };
}

async function vkm<T>(
  managerUrl: string,
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${managerUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`venice-key-manager ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function classifySize(contextLength: number): ModelSizeTier {
  if (contextLength >= 128000) return "large";
  if (contextLength > 32768) return "medium";
  return "flash";
}

export function pickModel(
  models: VeniceModel[],
  sizeTier: ModelSizeTier,
  pinnedModelId?: string,
): VeniceModel {
  const live = models.filter((m) => !m.offline && (m.type ?? "text") !== "image");
  if (pinnedModelId) {
    const pinned = live.find((m) => m.id === pinnedModelId);
    if (pinned) return pinned;
  }
  if (sizeTier === "flash") {
    for (const id of DEFAULT_FLASH_IDS) {
      const hit = live.find((m) => m.id === id);
      if (hit) return hit;
    }
    const flash = live.find(
      (m) => /flash/i.test(m.id) || (m.context_length ?? 0) <= 32768,
    );
    if (flash) return flash;
  }
  if (sizeTier === "medium") {
    const mid = live.find((m) => {
      const n = m.context_length ?? 0;
      return n > 32768 && n < 128000;
    });
    if (mid) return mid;
  }
  if (sizeTier === "large") {
    const large = live.find((m) => (m.context_length ?? 0) >= 128000);
    if (large) return large;
  }
  if (!live.length) throw new Error("venice-key-manager returned no usable models");
  return live[0];
}

export function publicRecord(record: AllocationRecord): AllocationRecord {
  const { apiKey: _omit, ...rest } = record;
  return rest;
}

export async function allocateVeniceInference(
  req: AllocationRequest,
): Promise<AllocationRecord> {
  const amountUsd = req.amountUsd ?? Number(env("VENICE_ALLOCATION_USD", "0.5"));
  const limitPeriod = req.limitPeriod ?? (env("VENICE_LIMIT_PERIOD", "EPOCH") as LimitPeriod);
  const sizeTier = req.sizeTier ?? (env("VENICE_MODEL_SIZE", "flash") as ModelSizeTier);
  const category = req.category ?? env("VENICE_KEY_CATEGORY", "ArtisanAutomata");
  const managerUrl = req.managerUrl ?? env("VENICE_KEY_MANAGER_URL", "http://127.0.0.1:8844");
  const accessToken = req.accessToken ?? env("VENICE_KEY_MANAGER_TOKEN");
  const pinnedModelId = req.pinnedModelId ?? env("VENICE_MODEL") || undefined;

  const base: AllocationRecord = {
    schemaVersion: "1.0.0",
    appSlug: req.appSlug,
    allocatedAt: new Date().toISOString(),
    status: "skipped",
    amountUsd,
    limitPeriod,
    keyType: "INFERENCE",
    category,
    model: { id: pinnedModelId ?? "deepseek-v4-flash", sizeTier, contextLength: 0 },
    manager: { baseUrl: managerUrl, source: "http" },
  };

  if (!accessToken) {
    return { ...base, skipReason: "VENICE_KEY_MANAGER_TOKEN unset" };
  }

  try {
    await vkm(managerUrl, accessToken, "/api/health");
  } catch (err) {
    return { ...base, status: "skipped", skipReason: `manager unreachable: ${(err as Error).message}` };
  }

  try {
    const balance = await vkm<{
      balances?: { USD?: number; DIEM?: number };
      next_epoch_begins?: string;
    }>(managerUrl, accessToken, "/api/balance");
    const usd = Number(balance.balances?.USD ?? 0);
    base.account = {
      usdRemaining: usd,
      diemRemaining: Number(balance.balances?.DIEM ?? 0),
      nextEpochBegins: balance.next_epoch_begins,
    };
    if (usd < amountUsd) {
      return { ...base, skipReason: `insufficient_balance: ${usd} < ${amountUsd}` };
    }

    const models = await vkm<VeniceModel[]>(managerUrl, accessToken, "/api/models");
    const model = pickModel(Array.isArray(models) ? models : [], sizeTier, pinnedModelId);
    const contextLength = model.context_length ?? 0;
    const resolvedTier = classifySize(contextLength || (sizeTier === "large" ? 128000 : 8192));

    const created = await vkm<{
      apiKey?: string;
      id?: string;
      last6Chars?: string;
    }>(managerUrl, accessToken, "/api/keys", {
      method: "POST",
      body: JSON.stringify({
        description: `artisan-automata:${req.appSlug}`,
        apiKeyType: "INFERENCE",
        daily_usd: amountUsd,
        limitPeriod,
        category,
      }),
    });

    if (req.smokeTest !== false && created.apiKey) {
      await vkm(managerUrl, accessToken, "/api/inference/test", {
        method: "POST",
        body: JSON.stringify({
          prompt: `Artisan-Automata ${req.appSlug} allocation check. Reply with OK.`,
          model: model.id,
          api_key: created.apiKey,
        }),
      });
    }

    return {
      ...base,
      status: "allocated",
      keyId: created.id,
      keyLast6: created.last6Chars,
      apiKey: created.apiKey,
      model: {
        id: model.id,
        name: model.name,
        sizeTier: resolvedTier,
        contextLength,
        privacy: model.privacy,
      },
    };
  } catch (err) {
    return { ...base, status: "failed", skipReason: (err as Error).message };
  }
}

export function envLinesForApp(record: AllocationRecord): string {
  const lines = [
    `VENICE_BASE_URL=https://api.venice.ai/api/v1`,
    `VENICE_MODEL=${record.model.id}`,
    `VENICE_MODEL_CONTEXT_LENGTH=${record.model.contextLength}`,
    `VENICE_MODEL_SIZE=${record.model.sizeTier}`,
    `VENICE_ALLOCATION_USD=${record.amountUsd}`,
    `VENICE_LIMIT_PERIOD=${record.limitPeriod}`,
    `VENICE_KEY_ID=${record.keyId ?? ""}`,
    `VENICE_API_KEY=${record.apiKey ?? ""}`,
  ];
  return lines.join("\n");
}
