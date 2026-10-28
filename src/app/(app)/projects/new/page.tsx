import type { Metadata } from "next";
import { createProject } from "../../actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, PageHeader, Textarea } from "@/components/ui";
import { DEFAULT_SECTIONS } from "@/lib/types";

export const metadata: Metadata = { title: "New project" };

export default function NewProject() {
  return (
    <div className="max-w-xl space-y-8">
      <PageHeader title="New project" description="One project per product. You can rename or add sections later." />
      <ActionForm action={createProject} className="space-y-5 rounded-xl bg-surface p-6 ring-1 ring-line">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required maxLength={80} placeholder="Equal Tab" autoFocus />
        </Field>
        <Field label="Description" htmlFor="description" help="Optional. Shown on share links.">
          <Textarea id="description" name="description" maxLength={280} className="min-h-20" placeholder="Split bills with roommates." />
        </Field>
        <Field label="Live site" htmlFor="website_url" help="Optional.">
          <Input id="website_url" name="website_url" placeholder="https://eqltab.com" inputMode="url" />
        </Field>
        <div className="rounded-lg bg-sunk px-4 py-3 text-[13.5px] text-ink-2">
          Starts with these sections: {DEFAULT_SECTIONS.map((s) => s.name).join(", ")}.
        </div>
        <SubmitButton pending="Creating…">Create project</SubmitButton>
      </ActionForm>
    </div>
  );
}
