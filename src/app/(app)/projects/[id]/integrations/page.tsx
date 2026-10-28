import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { INTEGRATION_COLUMNS, type Integration, type Section } from "@/lib/types";
import { providerSpec } from "@/lib/integrations/providers";
import { deleteIntegration } from "../../../actions";
import { IntegrationForm } from "@/components/integration-form";
import { ConfirmButton } from "@/components/forms";
import { Lamp, Panel, STATUS_LABEL, timeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Services" };

export default async function IntegrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const [{ data: ints }, { data: secs }] = await Promise.all([
    supabase.from("integrations").select(INTEGRATION_COLUMNS).eq("project_id", id).order("created_at"),
    supabase.from("sections").select("id, project_id, name, kind, position").eq("project_id", id).order("position"),
  ]);
  const integrations = (ints ?? []) as Integration[];
  const sections = (secs ?? []) as Section[];

  return (
    <div className="space-y-6">
      {integrations.length ? (
        <Panel title="Connected" description="Checked on a schedule, and whenever you press Check now.">
          <ul className="divide-y divide-line">
            {integrations.map((i) => {
              const details = Object.entries(i.last_details ?? {}).filter(([, v]) => v !== null && v !== "" && typeof v !== "object");
              return (
                <li key={i.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <span className="pt-1.5">
                    <Lamp status={i.last_status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.label}</p>
                    <p className="text-[13.5px] text-ink-2">{i.last_summary ?? STATUS_LABEL[i.last_status]}</p>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      {providerSpec(i.provider)?.name}
                      {i.secret_hint ? <span className="font-mono">, key ending {i.secret_hint}</span> : null}
                      {sections.find((s) => s.id === i.section_id) ? `, in ${sections.find((s) => s.id === i.section_id)!.name}` : ""}
                      {`, checked ${timeAgo(i.last_checked_at)}`}
                    </p>
                    {details.length ? (
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[12.5px]">
                        {details.map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-ink-3">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
                            <dd className="truncate font-mono text-ink-2">
                              {typeof v === "string" && v.startsWith("https://") ? (
                                <a href={v} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                                  {v.replace("https://", "")}
                                </a>
                              ) : (
                                String(v)
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                  <form action={deleteIntegration}>
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="integration_id" value={i.id} />
                    <ConfirmButton message={`Disconnect ${i.label}? Its stored key is deleted.`}>Disconnect</ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel
        title="Connect a service"
        description="Use read-only tokens where the service offers them. Keys are encrypted with AES-256 and only used to run checks."
      >
        <div className="p-5">
          <IntegrationForm projectId={id} sections={sections} />
        </div>
      </Panel>
    </div>
  );
}
