import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import type { Section } from "@/lib/types";
import { addSection, deleteProject, deleteSection, renameSection, updateProject } from "../../../actions";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Field, Input, Panel, Textarea } from "@/components/ui";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettings({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await getUser();
  const [{ data: project }, { data: secs }] = await Promise.all([
    supabase.from("projects").select("id, name, description, website_url").eq("id", id).single(),
    supabase.from("sections").select("id, project_id, name, kind, position").eq("project_id", id).order("position"),
  ]);
  const sections = (secs ?? []) as Section[];
  if (!project) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <Panel title="Details">
        <ActionForm action={updateProject} className="space-y-4 p-5">
          <input type="hidden" name="project_id" value={id} />
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" defaultValue={project.name} required maxLength={80} />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={project.description ?? ""} maxLength={280} className="min-h-20" />
          </Field>
          <Field label="Live site" htmlFor="website_url">
            <Input id="website_url" name="website_url" defaultValue={project.website_url ?? ""} inputMode="url" />
          </Field>
          <SubmitButton>Save changes</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel title="Sections" description="Links and services are grouped by section. Deleting a section moves its links to Unsorted.">
        <ul className="divide-y divide-line">
          {sections.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-5 py-2.5">
              <form action={renameSection} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="section_id" value={s.id} />
                <Input name="name" defaultValue={s.name} maxLength={40} aria-label={`Rename ${s.name}`} className="h-9 py-1" />
                <SubmitButton variant="ghost" size="sm" pending="…">
                  Rename
                </SubmitButton>
              </form>
              <form action={deleteSection}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="section_id" value={s.id} />
                <ConfirmButton message={`Delete the ${s.name} section? Its links move to Unsorted.`}>Delete</ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        <ActionForm action={addSection} className="flex gap-2 border-t border-line p-5" resetOnSuccess>
          <input type="hidden" name="project_id" value={id} />
          <Input name="name" placeholder="New section, e.g. Mobile app" maxLength={40} aria-label="New section name" required />
          <SubmitButton variant="secondary">Add</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel title="Delete project" description="Removes every link, note, service, stored key and share link in this project. This can't be undone.">
        <form action={deleteProject} className="space-y-3 p-5">
          <input type="hidden" name="project_id" value={id} />
          <Field label={`Type ${project.name} to confirm`} htmlFor="confirm">
            <Input id="confirm" name="confirm" autoComplete="off" required />
          </Field>
          {error === "confirm" ? (
            <p role="alert" className="text-sm text-down">
              The name didn&apos;t match. Nothing was deleted.
            </p>
          ) : null}
          <SubmitButton variant="danger" pending="Deleting…">
            Delete project
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
