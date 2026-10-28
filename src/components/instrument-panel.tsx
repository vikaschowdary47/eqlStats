import Link from "next/link";
import type { Integration, Status } from "@/lib/types";
import { overallStatus } from "@/lib/data";
import { providerSpec } from "@/lib/integrations/providers";
import { runChecks } from "@/app/(app)/actions";
import { Lamp, STATUS_LABEL, buttonClass, timeAgo } from "./ui";
import { SubmitButton } from "./forms";

const HEADLINE: Record<Status, string> = {
  ok: "All systems normal",
  warn: "Something needs a look",
  down: "Something is failing",
  unknown: "Waiting for first check",
};

/** The dark plate of status lamps at the top of every project. */
export function InstrumentPanel({ projectId, integrations, readOnly = false }: { projectId: string; integrations: Integration[]; readOnly?: boolean }) {
  const status = overallStatus(integrations.map((i) => i.last_status));
  const lastChecked = integrations
    .map((i) => i.last_checked_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <section className="plate px-5 pb-5 pt-7 sm:px-7" aria-label="Service status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Lamp status={status} size={14} />
          <div>
            <p className="font-display text-[19px] font-semibold leading-tight">
              {integrations.length ? HEADLINE[status] : "No services connected"}
            </p>
            <p className="text-[13px] text-plate-ink-2">
              {integrations.length ? `Last checked ${timeAgo(lastChecked)}` : "Connect Vercel, Supabase, a domain or an AI key to see live status."}
            </p>
          </div>
        </div>
        {!readOnly ? (
          <div className="flex gap-2">
            {integrations.length ? (
              <form action={runChecks}>
                <input type="hidden" name="project_id" value={projectId} />
                <SubmitButton variant="plate" size="sm" pending="Checking…">
                  Check now
                </SubmitButton>
              </form>
            ) : null}
            <Link href={`/projects/${projectId}/integrations`} className={buttonClass("plate", "sm")}>
              Connect a service
            </Link>
          </div>
        ) : null}
      </div>

      {integrations.length ? (
        <ul className="mt-5 grid gap-px overflow-hidden rounded-lg bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i, idx) => (
            <li key={i.id} className="flex gap-3 bg-plate-2/70 px-4 py-3">
              <span className="pt-1.5">
                <Lamp status={i.last_status} index={idx} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{i.label}</p>
                <p className="text-[13px] leading-snug text-plate-ink-2">
                  {i.last_summary ?? STATUS_LABEL[i.last_status]}
                </p>
                <p className="mt-0.5 text-[11.5px] text-plate-ink-2/70">{providerSpec(i.provider)?.name}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
