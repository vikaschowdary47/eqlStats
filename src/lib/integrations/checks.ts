import "server-only";
import type { Provider, Status } from "../types";

// One function per provider. Each returns a status, a one-line summary a
// person can act on, and a few details for the dashboard. Secrets are passed
// in, used for one request, and never logged or returned.

export interface CheckResult {
  status: Status;
  summary: string;
  details?: Record<string, string | number | boolean | null>;
}

type Config = Record<string, unknown>;
type Checker = (config: Config, secret: string | null) => Promise<CheckResult>;

const TIMEOUT_MS = 10_000;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

async function request(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  let body: unknown = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body: body as any };
}

const rejected = (what: string): CheckResult => ({ status: "down", summary: `${what} was rejected. Replace it in settings.` });

// ---------------------------------------------------------------------------

const vercel: Checker = async (config, secret) => {
  if (!secret) return { status: "unknown", summary: "Add an access token to check deployments." };
  const params = new URLSearchParams({ projectId: str(config.projectId), limit: "1", target: "production" });
  if (str(config.teamId)) params.set("teamId", str(config.teamId));
  const { res, body } = await request(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 401 || res.status === 403) return rejected("The Vercel token");
  if (res.status === 404) return { status: "down", summary: "Project not found. Check the name and team ID." };
  if (!res.ok) return { status: "unknown", summary: `Vercel responded with ${res.status}.` };

  const d = body?.deployments?.[0];
  if (!d) return { status: "warn", summary: "No production deployments yet." };
  const state: string = d.state ?? d.readyState ?? "UNKNOWN";
  const when = d.createdAt ?? d.created;
  const details = { state, url: d.url ? `https://${d.url}` : null, deployedAt: when ? new Date(when).toISOString() : null, commit: d.meta?.githubCommitMessage ?? null };
  switch (state) {
    case "READY":
      return { status: "ok", summary: "Production is live.", details };
    case "BUILDING":
    case "INITIALIZING":
    case "QUEUED":
      return { status: "warn", summary: "A production deploy is in progress.", details };
    case "ERROR":
      return { status: "down", summary: "The latest production deploy failed.", details };
    case "CANCELED":
      return { status: "warn", summary: "The latest production deploy was cancelled.", details };
    default:
      return { status: "unknown", summary: `Deployment state: ${state}.`, details };
  }
};

const supabase: Checker = async (config, secret) => {
  if (!secret) return { status: "unknown", summary: "Add an access token to check this project." };
  const ref = str(config.projectRef);
  const { res, body } = await request(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 401 || res.status === 403) return rejected("The Supabase token");
  if (res.status === 404) return { status: "down", summary: "Project not found. Check the project ref." };
  if (!res.ok) return { status: "unknown", summary: `Supabase responded with ${res.status}.` };

  const s: string = body?.status ?? "UNKNOWN";
  const details = { state: s, region: body?.region ?? null, name: body?.name ?? null };
  if (s === "ACTIVE_HEALTHY") return { status: "ok", summary: "Project is healthy.", details };
  if (s === "INACTIVE" || s === "PAUSED") return { status: "warn", summary: "Project is paused. Restore it from the Supabase dashboard.", details };
  if (s === "COMING_UP" || s === "RESTORING" || s === "UPGRADING" || s === "RESTARTING")
    return { status: "warn", summary: "Project is starting up.", details };
  return { status: "down", summary: `Project status is ${s.toLowerCase().replace(/_/g, " ")}.`, details };
};

const cloudflare: Checker = async (config, secret) => {
  if (!secret) return { status: "unknown", summary: "Add an API token to check this zone." };
  const zone = str(config.zone).toLowerCase();
  const { res, body } = await request(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zone)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.status === 401 || res.status === 403) return rejected("The Cloudflare token");
  if (!res.ok || body?.success === false) return { status: "unknown", summary: `Cloudflare responded with ${res.status}.` };

  const z = body?.result?.[0];
  if (!z) return { status: "down", summary: `${zone} isn't in this Cloudflare account, or the token can't see it.` };
  const details = { state: z.status, plan: z.plan?.name ?? null, nameservers: (z.name_servers ?? []).join(", ") };
  if (z.paused) return { status: "warn", summary: "Cloudflare is paused for this zone.", details };
  if (z.status === "active") return { status: "ok", summary: "Zone is active on Cloudflare.", details };
  if (z.status === "pending") return { status: "warn", summary: "Waiting for nameservers to point to Cloudflare.", details };
  return { status: "down", summary: `Zone status is ${z.status}.`, details };
};

const domain: Checker = async (config) => {
  const name = str(config.domain).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) return { status: "unknown", summary: "Enter a domain like example.com." };
  const { res, body } = await request(`https://rdap.org/domain/${encodeURIComponent(name)}`, {
    headers: { Accept: "application/rdap+json" },
    redirect: "follow",
  });
  if (res.status === 404) return { status: "down", summary: `${name} isn't registered.` };
  if (!res.ok) return { status: "unknown", summary: "The domain registry didn't answer. Will retry." };

  const events: { eventAction: string; eventDate: string }[] = body?.events ?? [];
  const expiry = events.find((e) => e.eventAction === "expiration")?.eventDate;
  const registrarEntity = (body?.entities ?? []).find((e: any) => e.roles?.includes("registrar"));
  const registrar: string | null =
    registrarEntity?.vcardArray?.[1]?.find((f: any[]) => f[0] === "fn")?.[3] ?? registrarEntity?.handle ?? null;
  const details = { registrar, expiresAt: expiry ?? null };
  if (!expiry) return { status: "unknown", summary: registrar ? `Registered with ${registrar}. No expiry date published.` : "No expiry date published.", details };

  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  const where = registrar ? ` at ${registrar}` : "";
  if (days < 0) return { status: "down", summary: `Expired ${-days} days ago${where}.`, details: { ...details, daysLeft: days } };
  if (days < 14) return { status: "down", summary: `Expires in ${days} days${where}. Renew now.`, details: { ...details, daysLeft: days } };
  if (days < 45) return { status: "warn", summary: `Expires in ${days} days${where}.`, details: { ...details, daysLeft: days } };
  return { status: "ok", summary: `Renews in ${days} days${where}.`, details: { ...details, daysLeft: days } };
};

const openai: Checker = async (config, secret) => {
  if (!secret) return { status: "unknown", summary: "Add an API key to check it." };
  const auth = { Authorization: `Bearer ${secret}` };
  const { res } = await request("https://api.openai.com/v1/models", { headers: auth });
  if (res.status === 401) return { status: "down", summary: "Key is invalid or was revoked." };
  if (res.status === 429) return { status: "warn", summary: "Rate limited right now. Will retry." };
  if (!res.ok) return { status: "unknown", summary: `OpenAI responded with ${res.status}.` };
  if (config.creditCheck !== true) return { status: "ok", summary: "Key is valid." };

  const probe = await request("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ model: str(config.model) || "gpt-4o-mini", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
  });
  if (probe.res.ok) return { status: "ok", summary: "Key is valid and has credit." };
  const code = probe.body?.error?.code ?? probe.body?.error?.type;
  if (code === "insufficient_quota") return { status: "down", summary: "Out of credit. Add funds in OpenAI billing." };
  if (probe.res.status === 404) return { status: "warn", summary: "Key is valid, but the credit-check model wasn't found." };
  return { status: "warn", summary: `Key is valid. Credit check returned ${probe.res.status}.` };
};

const anthropic: Checker = async (config, secret) => {
  if (!secret) return { status: "unknown", summary: "Add an API key to check it." };
  const headers = { "x-api-key": secret, "anthropic-version": "2023-06-01" };
  const { res } = await request("https://api.anthropic.com/v1/models", { headers });
  if (res.status === 401) return { status: "down", summary: "Key is invalid or was revoked." };
  if (res.status === 403) return { status: "down", summary: "Key doesn't have permission to use the API." };
  if (res.status === 429) return { status: "warn", summary: "Rate limited right now. Will retry." };
  if (!res.ok) return { status: "unknown", summary: `Anthropic responded with ${res.status}.` };
  if (config.creditCheck !== true) return { status: "ok", summary: "Key is valid." };

  const probe = await request("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ model: str(config.model) || "claude-haiku-4-5", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
  });
  if (probe.res.ok) return { status: "ok", summary: "Key is valid and has credit." };
  const message: string = probe.body?.error?.message ?? "";
  if (/credit balance/i.test(message)) return { status: "down", summary: "Out of credit. Add funds in Anthropic billing." };
  if (probe.res.status === 404) return { status: "warn", summary: "Key is valid, but the credit-check model wasn't found." };
  return { status: "warn", summary: `Key is valid. Credit check returned ${probe.res.status}.` };
};

const gemini: Checker = async (_config, secret) => {
  if (!secret) return { status: "unknown", summary: "Add an API key to check it." };
  const { res } = await request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
    headers: { "x-goog-api-key": secret },
  });
  if (res.status === 400 || res.status === 401 || res.status === 403)
    return { status: "down", summary: "Key is invalid, restricted, or the API isn't enabled." };
  if (res.status === 429) return { status: "warn", summary: "Quota exceeded right now." };
  if (!res.ok) return { status: "unknown", summary: `Google responded with ${res.status}.` };
  return { status: "ok", summary: "Key is valid." };
};

const CHECKERS: Record<Provider, Checker> = { vercel, supabase, cloudflare, domain, openai, anthropic, gemini };

export async function runCheck(provider: Provider, config: Config, secret: string | null): Promise<CheckResult & { latencyMs: number }> {
  const started = Date.now();
  try {
    const result = await CHECKERS[provider](config, secret);
    return { ...result, latencyMs: Date.now() - started };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      status: "unknown",
      summary: timedOut ? "The service didn't respond in time. Will retry." : "Couldn't reach the service. Will retry.",
      latencyMs: Date.now() - started,
    };
  }
}
