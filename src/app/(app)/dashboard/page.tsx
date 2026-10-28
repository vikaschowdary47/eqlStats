import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data";
import { Lamp, PageHeader, STATUS_LABEL, buttonClass, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Projects" };

export default async function Dashboard() {
  const { supabase } = await getUser();
  const projects = await listProjects(supabase);
  const failing = projects.filter((p) => p.status === "down").length;
  const attention = projects.filter((p) => p.status === "warn").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description={
          projects.length === 0
            ? "Start with one project. Paste the console links you keep losing, then connect services for live status."
            : failing
              ? `${failing} project${failing > 1 ? "s have" : " has"} a failing service.`
              : attention
                ? `${attention} project${attention > 1 ? "s need" : " needs"} a look.`
                : "Everything is running."
        }
        actions={
          <Link href="/projects/new" className={buttonClass()}>
            New project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
          <div className="mx-auto flex w-fit gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Lamp key={i} status="unknown" size={12} />
            ))}
          </div>
          <h2 className="mt-5 text-xl font-semibold">No projects yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-ink-2">A project holds the links, notes and services behind one product.</p>
          <Link href="/projects/new" className={buttonClass() + " mt-6"}>
            Create your first project
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="grid gap-3 px-5 py-4 transition-colors hover:bg-sunk/60 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="pt-1.5">
                    <Lamp status={p.status} size={12} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[18px] font-semibold">{p.name}</p>
                    <p className="truncate text-[13.5px] text-ink-3">
                      {p.description || `${STATUS_LABEL[p.status]}. Updated ${timeAgo(p.updated_at)}.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-5 pl-6 text-[13px] text-ink-3 sm:pl-0">
                  <span className="flex items-center gap-1.5" aria-label={`${p.integrations.length} services`}>
                    {p.integrations.slice(0, 8).map((i, idx) => (
                      <span key={idx} title={`${i.label}: ${i.last_summary ?? STATUS_LABEL[i.last_status]}`}>
                        <Lamp status={i.last_status} size={8} />
                      </span>
                    ))}
                    {p.integrations.length === 0 ? "No services" : null}
                  </span>
                  <span className="tabular-nums">{p.linkCount} links</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
