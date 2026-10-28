import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { SHARE_COLUMNS, type Section, type ShareLink } from "@/lib/types";
import { deleteShare, revokeShare } from "../../../actions";
import { ShareCopy, ShareEdit, ShareForm } from "@/components/share-form";
import { ConfirmButton } from "@/components/forms";
import { Lamp, Panel, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Share" };

function linkState(l: ShareLink): { status: "ok" | "warn" | "unknown"; text: string } {
  if (l.revoked_at) return { status: "unknown", text: `Revoked ${timeAgo(l.revoked_at)}` };
  if (l.expires_at && new Date(l.expires_at) < new Date()) return { status: "unknown", text: `Expired ${timeAgo(l.expires_at)}` };
  if (l.expires_at) return { status: "ok", text: `Active, expires ${timeAgo(l.expires_at)}` };
  return { status: "warn", text: "Active, never expires" };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const [{ data: links }, { data: secs }] = await Promise.all([
    supabase.from("share_links").select(SHARE_COLUMNS).eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("sections").select("id, project_id, name, kind, position").eq("project_id", id).order("position"),
  ]);
  const shares = (links ?? []) as ShareLink[];
  const sections = (secs ?? []) as Section[];
  const sectionName = (sid: string) => sections.find((s) => s.id === sid)?.name;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Panel title="New share link" description="Pick exactly what the other person sees. You can change it or turn it off later.">
        <div className="p-5">
          <ShareForm projectId={id} sections={sections} />
        </div>
      </Panel>

      <Panel title="Your links" description={shares.length ? "Changes apply immediately to anyone holding the link." : undefined}>
        {shares.length === 0 ? (
          <p className="px-5 py-8 text-[14px] text-ink-3">No links yet. Create one to share a read-only view of this project.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shares.map((l) => {
              const st = linkState(l);
              const live = !l.revoked_at && !(l.expires_at && new Date(l.expires_at) < new Date());
              const visible = l.visible_section_ids.map(sectionName).filter(Boolean);
              const extras = [l.show_status && "status", l.show_links && "links", l.show_stats && "stats"].filter(Boolean);
              return (
                <li key={l.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <Lamp status={st.status} size={8} /> {l.label}
                      </p>
                      <p className="text-[13px] text-ink-3">
                        {st.text}. {l.view_count === 1 ? "1 view" : `${l.view_count} views`}
                        {l.last_viewed_at ? `, last ${timeAgo(l.last_viewed_at)}` : ""}.
                      </p>
                      <p className="mt-1 text-[13px] text-ink-2">
                        Shows {visible.length ? visible.join(", ") : "no sections"}
                        {extras.length ? ` with ${extras.join(", ")}` : ""}.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {live ? <ShareCopy shareId={l.id} projectId={id} /> : null}
                      {live ? (
                        <form action={revokeShare}>
                          <input type="hidden" name="project_id" value={id} />
                          <input type="hidden" name="share_id" value={l.id} />
                          <ConfirmButton message={`Turn off “${l.label}”? The link stops working immediately.`}>Turn off</ConfirmButton>
                        </form>
                      ) : (
                        <form action={deleteShare}>
                          <input type="hidden" name="project_id" value={id} />
                          <input type="hidden" name="share_id" value={l.id} />
                          <ConfirmButton message={`Delete “${l.label}” and its view history?`}>Delete</ConfirmButton>
                        </form>
                      )}
                    </div>
                  </div>
                  {live ? <ShareEdit projectId={id} sections={sections} link={l} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
