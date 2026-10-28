import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INTEGRATION_COLUMNS,
  SHARE_COLUMNS,
  type Integration,
  type Project,
  type Resource,
  type Section,
  type ShareLink,
  type Status,
} from "./types";

export interface ProjectStats {
  servicesOk: number;
  servicesTotal: number;
  uptime7d: number | null;          // 0–100, null when no checks yet
  daily: { day: string; ratio: number | null }[]; // last 14 days, oldest first
  shareViews30d: number;
  lastDeployAt: string | null;
}

export interface ProjectBundle {
  project: Project;
  sections: Section[];
  resources: Resource[];
  integrations: Integration[];
  shares: ShareLink[];
  stats: ProjectStats;
}

const DAY = 86_400_000;

export function overallStatus(statuses: Status[]): Status {
  if (statuses.length === 0) return "unknown";
  if (statuses.includes("down")) return "down";
  if (statuses.includes("warn")) return "warn";
  if (statuses.every((s) => s === "unknown")) return "unknown";
  return "ok";
}

export function computeStats(
  integrations: Integration[],
  checks: { status: Status; checked_at: string }[],
  viewCount30d: number,
): ProjectStats {
  const now = Date.now();
  const days: ProjectStats["daily"] = [];
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now - i * DAY);
    start.setUTCHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    const known = checks.filter((c) => {
      const t = new Date(c.checked_at).getTime();
      return t >= start.getTime() && t < end && c.status !== "unknown";
    });
    days.push({
      day: start.toISOString().slice(0, 10),
      ratio: known.length ? known.filter((c) => c.status === "ok").length / known.length : null,
    });
  }

  const week = checks.filter((c) => now - new Date(c.checked_at).getTime() < 7 * DAY && c.status !== "unknown");
  const deploys = integrations
    .filter((i) => i.provider === "vercel" && typeof i.last_details?.deployedAt === "string")
    .map((i) => i.last_details.deployedAt as string)
    .sort()
    .reverse();

  return {
    servicesOk: integrations.filter((i) => i.last_status === "ok").length,
    servicesTotal: integrations.length,
    uptime7d: week.length ? Math.round((week.filter((c) => c.status === "ok").length / week.length) * 1000) / 10 : null,
    daily: days,
    shareViews30d: viewCount30d,
    lastDeployAt: deploys[0] ?? null,
  };
}

export async function listProjects(supabase: SupabaseClient) {
  const [{ data: projects }, { data: integrations }, { data: resources }] = await Promise.all([
    supabase.from("projects").select("id, name, description, website_url, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("integrations").select("project_id, provider, label, last_status, last_summary"),
    supabase.from("resources").select("project_id"),
  ]);
  return (projects ?? []).map((p) => {
    const own = (integrations ?? []).filter((i) => i.project_id === p.id);
    return {
      ...(p as Project),
      integrations: own as Pick<Integration, "provider" | "label" | "last_status" | "last_summary">[],
      status: overallStatus(own.map((i) => i.last_status as Status)),
      linkCount: (resources ?? []).filter((r) => r.project_id === p.id).length,
    };
  });
}

export async function getProjectBundle(supabase: SupabaseClient, id: string): Promise<ProjectBundle | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, website_url, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!project) return null;

  const since14 = new Date(Date.now() - 14 * DAY).toISOString();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const [sections, resources, integrations, shares, checks, views] = await Promise.all([
    supabase.from("sections").select("id, project_id, name, kind, position").eq("project_id", id).order("position"),
    supabase
      .from("resources")
      .select("id, project_id, section_id, kind, title, url, provider, note, pinned, created_at")
      .eq("project_id", id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("integrations").select(INTEGRATION_COLUMNS).eq("project_id", id).order("created_at"),
    supabase.from("share_links").select(SHARE_COLUMNS).eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("integration_checks").select("status, checked_at").eq("project_id", id).gte("checked_at", since14).limit(10_000),
    supabase.from("share_views").select("id", { count: "exact", head: true }).eq("project_id", id).gte("viewed_at", since30),
  ]);

  const ints = (integrations.data ?? []) as Integration[];
  return {
    project: project as Project,
    sections: (sections.data ?? []) as Section[],
    resources: (resources.data ?? []) as Resource[],
    integrations: ints,
    shares: (shares.data ?? []) as ShareLink[],
    stats: computeStats(ints, (checks.data ?? []) as { status: Status; checked_at: string }[], views.count ?? 0),
  };
}
