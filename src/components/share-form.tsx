"use client";

import { useState } from "react";
import { createShare, getShareUrl, updateShare } from "@/app/(app)/actions";
import type { Section, ShareLink } from "@/lib/types";
import { ActionForm, CopyButton, SubmitButton } from "./forms";
import { Field, Input, Select } from "./ui";

const SECTION_HINT: Record<string, string> = {
  money: "Revenue and billing links. Often kept private.",
  infra: "Domains, DNS and hosting.",
  backend: "Databases, APIs and AI keys status.",
  frontend: "Deploys and the live site.",
  code: "Repos, docs and boards.",
};

function Toggle({ name, value, label, help, defaultChecked }: { name: string; value?: string; label: string; help?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{label}</span>
        {help ? <span className="block text-[12.5px] text-ink-3">{help}</span> : null}
      </span>
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="switch" />
    </label>
  );
}

export function ShareForm({ projectId, sections, link }: { projectId: string; sections: Section[]; link?: ShareLink }) {
  const editing = !!link;
  return (
    <ActionForm action={editing ? updateShare : createShare} className="space-y-5" resetOnSuccess={!editing}>
      <input type="hidden" name="project_id" value={projectId} />
      {link ? <input type="hidden" name="share_id" value={link.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who is this for?" htmlFor={`label-${link?.id ?? "new"}`} help="Only you see this name.">
          <Input id={`label-${link?.id ?? "new"}`} name="label" defaultValue={link?.label} placeholder="Co-founder, Client, Investor update" maxLength={60} />
        </Field>
        <Field label="Link expires" htmlFor={`exp-${link?.id ?? "new"}`}>
          <Select id={`exp-${link?.id ?? "new"}`} name="expires_in" defaultValue={editing ? "keep" : "30d"}>
            {editing ? <option value="keep">Keep current expiry</option> : null}
            <option value="1d">In 1 day</option>
            <option value="7d">In 7 days</option>
            <option value="30d">In 30 days</option>
            <option value="never">Never</option>
          </Select>
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Sections they can see</legend>
        <div className="mt-2 divide-y divide-line rounded-lg ring-1 ring-line">
          {sections.map((s) => (
            <Toggle
              key={s.id}
              name="sections"
              value={s.id}
              label={s.name}
              help={SECTION_HINT[s.kind]}
              defaultChecked={link ? link.visible_section_ids.includes(s.id) : s.kind !== "money"}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">What to include</legend>
        <div className="mt-2 divide-y divide-line rounded-lg ring-1 ring-line">
          <Toggle name="show_status" label="Live status" help="Lamps and summaries for services in the sections above." defaultChecked={link?.show_status ?? true} />
          <Toggle name="show_links" label="Clickable links" help="Off shows titles only, so console URLs stay private." defaultChecked={link?.show_links ?? false} />
          <Toggle name="show_stats" label="Stats" help="Uptime and daily health." defaultChecked={link?.show_stats ?? false} />
        </div>
      </fieldset>

      <SubmitButton pending={editing ? "Saving…" : "Creating…"}>{editing ? "Save changes" : "Create link"}</SubmitButton>
    </ActionForm>
  );
}

export function ShareCopy({ shareId, projectId }: { shareId: string; projectId: string }) {
  return <CopyButton getValue={() => getShareUrl(shareId, projectId)} />;
}

export function ShareEdit({ projectId, sections, link }: { projectId: string; sections: Section[]; link: ShareLink }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-[13px] font-medium text-ink-2 hover:text-ink">
        {open ? "Close" : "Change what they see"}
      </button>
      {open ? (
        <div className="mt-3 rounded-lg bg-sunk p-4">
          <ShareForm projectId={projectId} sections={sections} link={link} />
        </div>
      ) : null}
    </div>
  );
}
