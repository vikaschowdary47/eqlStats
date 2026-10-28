import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/crypto";
import { computeStats } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { InstrumentPanel } from "@/components/instrument-panel";
import { SectionGrid } from "@/components/sections";
import { StatsStrip } from "@/components/stats";
import { Lamp, timeAgo } from "@/components/ui";
import type { Integration, Resource, Section, Status } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared project", robots: { index: false, follow: false } };

function Unavailable() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Lamp status="unknown" size={14} />
      <h1 className="mt-5 text-3xl font-semibold">This link isn&apos;t active</h1>
      <p className="mt-2 text-ink-2">It may have expired or been turned off. Ask the person who shared it for a new one.</p>
    </main>
  );
}

/**
 * Public, read-only view of a project. Runs with the service role, so every
 * query below is scoped to the share link's project and its allowed sections.
 * Secrets are never selected.
 */
export default async function SharedProject({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return <Unavailable />;

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("share_links")
    .select("id, project_id, visible_section_ids, show_status, show_links, show_stats, expires_at, revoked_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!link || link.revoked_at || (link.expires_at && new Date(link.expires_at) < new Date())) return <Unavailable />;

  const allowed: string[] = link.visible_section_ids ?? [];
  const none = ["00000000-0000-0000-0000-000000000000"]; // keeps `in` filters valid when empty

  const [{ data: project }, { data: secs }, { data: res }, { data: ints }] = await Promise.all([
    admin.from("projects").select("id, name, description, website_url").eq("id", link.project_id).single(),
    admin.from("sections").select("id, project_id, name, kind, position").eq("project_id", link.project_id).in("id", allowed.length ? allowed : none).order("position"),
    admin
      .from("resources")
      .select("id, project_id, section_id, kind, title, url, provider, note, pinned, created_at")
      .eq("project_id", link.project_id)
      .in("section_id", allowed.length ? allowed : none)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    link.show_status || link.show_stats
      ? admin
          .from("integrations")
          .select("id, project_id, section_id, provider, label, last_status, last_summary, last_details, last_checked_at, created_at")
          .eq("project_id", link.project_id)
          .in("section_id", allowed.length ? allowed : none)
      : Promise.resolve({ data: [] }),
  ]);
  if (!project) return <Unavailable />;

  // Strip URLs server-side when links are off, so they never reach the page.
  const resources = ((res ?? []) as Resource[]).map((r) => (link.show_links ? r : { ...r, url: null }));
  const integrations = ((ints ?? []) as Omit<Integration, "config" | "secret_hint">[]).map(
    (i) => ({ ...i, config: {}, secret_hint: null, last_details: link.show_links ? i.last_details : {} }) as Integration,
  );
  const sections = (secs ?? []) as Section[];

  let stats = null;
  if (link.show_stats) {
    const ids = integrations.map((i) => i.id);
    const { data: checks } = await admin
      .from("integration_checks")
      .select("status, checked_at")
      .in("integration_id", ids.length ? ids : none)
      .gte("checked_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
      .limit(10_000);
    stats = computeStats(integrations, (checks ?? []) as { status: Status; checked_at: string }[], 0);
  }

  await admin.rpc("record_share_view", { p_link_id: link.id });

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-3 sm:px-8">
          <p className="text-[13px] text-ink-3">Read-only view shared with you</p>
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink">
            <Lamp status="ok" size={7} /> {BRAND.name}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] space-y-6 px-4 pb-24 pt-8 sm:px-8">
        <div>
          <h1 className="text-[32px] font-semibold sm:text-[38px]">{project.name}</h1>
          {project.description ? <p className="mt-1 max-w-[62ch] text-ink-2">{project.description}</p> : null}
          {project.website_url ? (
            <a href={project.website_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-mono text-[13.5px] text-ink-3 hover:text-ink">
              {new URL(project.website_url).hostname}
            </a>
          ) : null}
        </div>

        {link.show_status && integrations.length ? <InstrumentPanel projectId={project.id} integrations={integrations} readOnly /> : null}
        {stats ? <StatsStrip stats={{ ...stats, shareViews30d: 0 }} hideViews /> : null}
        <SectionGrid
          sections={sections}
          resources={resources}
          integrations={integrations}
          mode={{ kind: "viewer", showLinks: link.show_links, showStatus: link.show_status }}
        />
        <p className="text-center text-[12.5px] text-ink-3">
          Status as of {timeAgo(integrations.map((i) => i.last_checked_at).filter(Boolean).sort().reverse()[0] ?? null)}.
        </p>
      </main>
    </div>
  );
}
