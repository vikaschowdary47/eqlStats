import type { Integration, Resource, Section } from "@/lib/types";
import { monogram, recognize } from "@/lib/recognize";
import { deleteResource, togglePin, updateResource } from "@/app/(app)/actions";
import { ActionForm, ConfirmButton, SubmitButton } from "./forms";
import { Lamp, Select, Textarea, Input, cx } from "./ui";

type Mode = { kind: "owner"; projectId: string } | { kind: "viewer"; showLinks: boolean; showStatus: boolean };

export function SectionGrid({
  sections,
  resources,
  integrations,
  mode,
}: {
  sections: Section[];
  resources: Resource[];
  integrations: Integration[];
  mode: Mode;
}) {
  const unsorted = resources.filter((r) => !r.section_id);
  const groups: { id: string; name: string; section?: Section }[] = [
    ...sections.map((s) => ({ id: s.id, name: s.name, section: s })),
    ...(unsorted.length && mode.kind === "owner" ? [{ id: "", name: "Unsorted" }] : []),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
      {groups.map((g) => {
        const items = resources.filter((r) => (r.section_id ?? "") === g.id);
        const services = integrations.filter((i) => (i.section_id ?? "") === g.id && g.id !== "");
        if (mode.kind === "viewer" && items.length === 0 && (!mode.showStatus || services.length === 0)) return null;
        return (
          <section key={g.id || "unsorted"} className="min-w-0 rounded-xl bg-surface ring-1 ring-line" aria-labelledby={`sec-${g.id || "unsorted"}`}>
            <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
              <h2 id={`sec-${g.id || "unsorted"}`} className="text-[17px] font-semibold">
                {g.name}
              </h2>
              <span className="text-[13px] text-ink-3">{items.length === 1 ? "1 item" : `${items.length} items`}</span>
            </header>

            {services.length && (mode.kind === "owner" || mode.showStatus) ? (
              <ul className="flex flex-wrap gap-2 px-5 pb-3">
                {services.map((s) => (
                  <li key={s.id} className="inline-flex items-center gap-2 rounded-full bg-sunk px-2.5 py-1 text-[12.5px] text-ink-2" title={s.last_summary ?? undefined}>
                    <Lamp status={s.last_status} size={8} />
                    {s.label}
                  </li>
                ))}
              </ul>
            ) : null}

            {items.length ? (
              <ul className="divide-y divide-line border-t border-line">
                {items.map((r) => (
                  <ResourceRow key={r.id} r={r} mode={mode} sections={sections} />
                ))}
              </ul>
            ) : (
              <p className="border-t border-line px-5 py-5 text-[13.5px] text-ink-3">
                {mode.kind === "owner" ? "Paste a link above and it lands here when it matches this section." : "Nothing shared in this section."}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function host(url: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function ResourceRow({ r, mode, sections }: { r: Resource; mode: Mode; sections: Section[] }) {
  const rec = r.url ? recognize(r.url) : null;
  const linkable = r.url && (mode.kind === "owner" || mode.showLinks);
  const title = linkable ? (
    <a href={r.url!} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-ink decoration-line-strong underline-offset-4 hover:underline">
      {r.title}
    </a>
  ) : (
    <span className="truncate font-medium text-ink">{r.title}</span>
  );

  return (
    <li className="group flex gap-3 px-5 py-3">
      <span
        aria-hidden
        className={cx(
          "mt-0.5 grid size-8 flex-none place-items-center rounded-lg font-mono text-[11px] font-semibold",
          r.kind === "note" ? "bg-sunk text-ink-3" : "bg-sunk text-ink-2",
        )}
      >
        {r.kind === "note" ? "Nt" : monogram(rec?.providerName ?? "Web")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 text-[14.5px]">
          {r.pinned ? <span className="flex-none text-[11px] font-semibold text-warn">Pinned</span> : null}
          {title}
        </p>
        <p className="truncate text-[12.5px] text-ink-3">
          {rec ? rec.providerName : r.kind === "note" ? "Note" : ""}
          {linkable && host(r.url) ? <span className="font-mono"> {host(r.url)}</span> : null}
        </p>
        {r.note ? <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">{r.note}</p> : null}

        {mode.kind === "owner" ? (
          <details className="mt-1">
            <summary className="inline text-[12.5px] text-ink-3 hover:text-ink">Edit</summary>
            <ActionForm action={updateResource} className="mt-2 space-y-2 rounded-lg bg-sunk p-3">
              <input type="hidden" name="project_id" value={mode.projectId} />
              <input type="hidden" name="resource_id" value={r.id} />
              <Input name="title" defaultValue={r.title} aria-label="Title" maxLength={140} required />
              <Select name="section_id" defaultValue={r.section_id ?? ""} aria-label="Section">
                <option value="">Unsorted</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Textarea name="note" defaultValue={r.note ?? ""} aria-label="Note" placeholder="Setup notes, settings to remember…" />
              <SubmitButton size="sm">Save changes</SubmitButton>
            </ActionForm>
          </details>
        ) : null}
      </div>

      {mode.kind === "owner" ? (
        <div className="flex flex-none items-start gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <form action={togglePin}>
            <input type="hidden" name="project_id" value={mode.projectId} />
            <input type="hidden" name="resource_id" value={r.id} />
            <input type="hidden" name="pinned" value={String(r.pinned)} />
            <SubmitButton variant="ghost" size="sm" pending="…">
              {r.pinned ? "Unpin" : "Pin"}
            </SubmitButton>
          </form>
          <form action={deleteResource}>
            <input type="hidden" name="project_id" value={mode.projectId} />
            <input type="hidden" name="resource_id" value={r.id} />
            <ConfirmButton message={`Remove “${r.title}”?`}>Remove</ConfirmButton>
          </form>
        </div>
      ) : null}
    </li>
  );
}
