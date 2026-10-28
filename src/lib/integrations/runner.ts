import "server-only";
import { createAdminClient } from "../supabase/admin";
import { decrypt } from "../crypto";
import { runCheck } from "./checks";
import type { Provider } from "../types";

interface Row {
  id: string;
  project_id: string;
  owner_id: string;
  provider: Provider;
  config: Record<string, unknown>;
  secret_ciphertext: string | null;
}

const CONCURRENCY = 5;

async function checkOne(row: Row) {
  const admin = createAdminClient();
  let secret: string | null = null;
  try {
    secret = row.secret_ciphertext ? decrypt(row.secret_ciphertext) : null;
  } catch {
    secret = null; // key rotated or corrupted: surface as "add a token"
  }
  const result = await runCheck(row.provider, row.config ?? {}, secret);
  const now = new Date().toISOString();

  await Promise.all([
    admin
      .from("integrations")
      .update({ last_status: result.status, last_summary: result.summary, last_details: result.details ?? {}, last_checked_at: now })
      .eq("id", row.id),
    admin.from("integration_checks").insert({
      integration_id: row.id,
      project_id: row.project_id,
      owner_id: row.owner_id,
      status: result.status,
      summary: result.summary,
      latency_ms: result.latencyMs,
      checked_at: now,
    }),
  ]);
  return result;
}

async function runAll(rows: Row[]) {
  const queue = [...rows];
  let ok = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      await checkOne(row);
      ok++;
    }
  });
  await Promise.all(workers);
  return ok;
}

const SELECT = "id, project_id, owner_id, provider, config, secret_ciphertext";

/** Checks every integration in a project. Caller must have verified ownership. */
export async function checkProject(projectId: string, ownerId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select(SELECT).eq("project_id", projectId).eq("owner_id", ownerId);
  return runAll((data ?? []) as Row[]);
}

/** Checks one integration. Caller must have verified ownership. */
export async function checkIntegration(integrationId: string, ownerId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select(SELECT).eq("id", integrationId).eq("owner_id", ownerId).maybeSingle();
  if (data) await checkOne(data as Row);
}

/** Scheduled run: the integrations checked longest ago, across all users. */
export async function checkDue(limit = 200, staleMinutes = 30) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - staleMinutes * 60_000).toISOString();
  const { data } = await admin
    .from("integrations")
    .select(SELECT)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  const checked = await runAll((data ?? []) as Row[]);

  // Keep 90 days of history.
  await admin.from("integration_checks").delete().lt("checked_at", new Date(Date.now() - 90 * 86_400_000).toISOString());
  return checked;
}
