"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt, hint, randomToken, sha256 } from "@/lib/crypto";
import { appUrl } from "@/lib/env";
import { fail, formRaw, formString, type ActionState } from "@/lib/action";
import { parseUrl, recognize } from "@/lib/recognize";
import { providerSpec } from "@/lib/integrations/providers";
import { checkIntegration, checkProject } from "@/lib/integrations/runner";
import { DEFAULT_SECTIONS, type Provider } from "@/lib/types";

async function requireUser() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Confirms the signed-in user owns the project (RLS hides other people's rows). */
async function ownedProject(projectId: string) {
  const ctx = await requireUser();
  if (!z.uuid().safeParse(projectId).success) return null;
  const { data } = await ctx.supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  return data ? ctx : null;
}

async function sectionBelongs(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], projectId: string, sectionId: string) {
  if (!sectionId) return true;
  const { data } = await supabase.from("sections").select("id").eq("id", sectionId).eq("project_id", projectId).maybeSingle();
  return !!data;
}

const optionalUrl = z
  .string()
  .max(2000)
  .transform((v) => v.trim())
  .refine((v) => v === "" || parseUrl(v) !== null, { message: "Enter a full web address." })
  .transform((v) => (v === "" ? null : parseUrl(v)!.toString()));

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const parsed = z
    .object({
      name: z.string().min(1, { message: "Give the project a name." }).max(80),
      description: z.string().max(280),
      website_url: optionalUrl,
    })
    .safeParse({ name: formString(fd, "name"), description: formString(fd, "description"), website_url: formString(fd, "website_url") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, description: parsed.data.description || null, owner_id: user.id })
    .select("id")
    .single();
  if (error || !project) return fail("Couldn't create the project. Try again.");

  await supabase
    .from("sections")
    .insert(DEFAULT_SECTIONS.map((s, position) => ({ ...s, position, project_id: project.id, owner_id: user.id })));

  redirect(`/projects/${project.id}`);
}

export async function updateProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");
  const parsed = z
    .object({ name: z.string().min(1, { message: "Give the project a name." }).max(80), description: z.string().max(280), website_url: optionalUrl })
    .safeParse({ name: formString(fd, "name"), description: formString(fd, "description"), website_url: formString(fd, "website_url") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const { error } = await ctx.supabase
    .from("projects")
    .update({ ...parsed.data, description: parsed.data.description || null })
    .eq("id", projectId);
  if (error) return fail("Couldn't save changes.");
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: "Saved." };
}

export async function deleteProject(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) redirect("/dashboard");
  const { data: project } = await ctx.supabase.from("projects").select("name").eq("id", projectId).single();
  if (formString(fd, "confirm") !== project?.name) redirect(`/projects/${projectId}/settings?error=confirm`);
  await ctx.supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function addSection(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");
  const name = formString(fd, "name");
  if (!name || name.length > 40) return fail("Section names are 1–40 characters.");
  const { count } = await ctx.supabase.from("sections").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if ((count ?? 0) >= 12) return fail("A project can have up to 12 sections.");
  await ctx.supabase.from("sections").insert({ project_id: projectId, owner_id: ctx.user.id, name, kind: "custom", position: count ?? 0 });
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: "Section added." };
}

export async function renameSection(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  const name = formString(fd, "name");
  if (!ctx || !name || name.length > 40) return;
  await ctx.supabase.from("sections").update({ name }).eq("id", formString(fd, "section_id")).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function deleteSection(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  // Links in the section move to "Unsorted" (section_id becomes null).
  await ctx.supabase.from("sections").delete().eq("id", formString(fd, "section_id")).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}`, "layout");
}

// ---------------------------------------------------------------------------
// Links and notes
// ---------------------------------------------------------------------------

export async function addResource(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");

  const rawUrl = formString(fd, "url");
  const note = formString(fd, "note").slice(0, 4000) || null;
  const url = rawUrl ? parseUrl(rawUrl) : null;
  if (rawUrl && !url) return fail("That doesn't look like a web address.");
  if (!url && !note) return fail("Paste a link or write a note.");

  const rec = url ? recognize(url.toString()) : null;
  const title = (formString(fd, "title") || rec?.title || "Note").slice(0, 140);

  // Section: the one chosen, otherwise the section matching the recognised kind.
  let sectionId = formString(fd, "section_id");
  if (sectionId && !(await sectionBelongs(ctx.supabase, projectId, sectionId))) return fail("Pick a section from this project.");
  if (!sectionId && rec) {
    const { data } = await ctx.supabase.from("sections").select("id").eq("project_id", projectId).eq("kind", rec.section).limit(1).maybeSingle();
    sectionId = data?.id ?? "";
  }

  const { error } = await ctx.supabase.from("resources").insert({
    project_id: projectId,
    owner_id: ctx.user.id,
    section_id: sectionId || null,
    kind: url ? "link" : "note",
    title,
    url: url?.toString() ?? null,
    provider: rec?.provider ?? null,
    note,
  });
  if (error) return fail("Couldn't save that. Try again.");
  revalidatePath(`/projects/${projectId}`);
  return { ok: url ? `Saved “${title}”.` : "Note saved." };
}

export async function updateResource(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");
  const title = formString(fd, "title");
  if (!title || title.length > 140) return fail("Titles are 1–140 characters.");
  const sectionId = formString(fd, "section_id");
  if (sectionId && !(await sectionBelongs(ctx.supabase, projectId, sectionId))) return fail("Pick a section from this project.");
  await ctx.supabase
    .from("resources")
    .update({ title, note: formString(fd, "note").slice(0, 4000) || null, section_id: sectionId || null })
    .eq("id", formString(fd, "resource_id"))
    .eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Saved." };
}

export async function togglePin(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  await ctx.supabase
    .from("resources")
    .update({ pinned: formString(fd, "pinned") !== "true" })
    .eq("id", formString(fd, "resource_id"))
    .eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteResource(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  await ctx.supabase.from("resources").delete().eq("id", formString(fd, "resource_id")).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}`);
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export async function addIntegration(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");

  const spec = providerSpec(formString(fd, "provider"));
  if (!spec) return fail("Pick a service to connect.");

  const config: Record<string, string | boolean> = {};
  for (const field of spec.fields) {
    if (field.type === "checkbox") {
      config[field.key] = fd.get(field.key) === "on";
      continue;
    }
    const value = formString(fd, field.key).slice(0, 200);
    if (!value && !field.optional) return fail(`${field.label} is required.`);
    if (value) config[field.key] = value;
  }

  const secret = formRaw(fd, "secret").trim();
  if (spec.secret && !secret) return fail(`${spec.secret.label} is required.`);
  if (secret.length > 1000) return fail("That key is too long.");

  const sectionId = formString(fd, "section_id");
  let section: string | null = sectionId || null;
  if (section && !(await sectionBelongs(ctx.supabase, projectId, section))) return fail("Pick a section from this project.");
  if (!section) {
    const { data } = await ctx.supabase.from("sections").select("id").eq("project_id", projectId).eq("kind", spec.section).limit(1).maybeSingle();
    section = data?.id ?? null;
  }

  const defaultLabel = String(config.projectId ?? config.projectRef ?? config.zone ?? config.domain ?? spec.name);
  const label = (formString(fd, "label") || (spec.id === "domain" || spec.id === "cloudflare" ? defaultLabel : `${spec.name}${defaultLabel !== spec.name ? ` · ${defaultLabel}` : ""}`)).slice(0, 80);

  const { data, error } = await ctx.supabase
    .from("integrations")
    .insert({
      project_id: projectId,
      owner_id: ctx.user.id,
      section_id: section,
      provider: spec.id as Provider,
      label,
      config,
      secret_ciphertext: secret ? encrypt(secret) : null,
      secret_hint: secret ? hint(secret) : null,
    })
    .select("id")
    .single();
  if (error || !data) return fail("Couldn't connect that service. Try again.");

  await checkIntegration(data.id, ctx.user.id);
  revalidatePath(`/projects/${projectId}`, "layout");
  redirect(`/projects/${projectId}`);
}

export async function deleteIntegration(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  await ctx.supabase.from("integrations").delete().eq("id", formString(fd, "integration_id")).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function runChecks(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  // Light throttle: skip if this project was checked in the last 20 seconds.
  const { data: latest } = await ctx.supabase
    .from("integrations")
    .select("last_checked_at")
    .eq("project_id", projectId)
    .order("last_checked_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (latest?.last_checked_at && Date.now() - new Date(latest.last_checked_at).getTime() < 20_000) return;
  await checkProject(projectId, ctx.user.id);
  revalidatePath(`/projects/${projectId}`, "layout");
}

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------

function shareOptions(fd: FormData) {
  const expiresIn = formString(fd, "expires_in");
  const days = { "1d": 1, "7d": 7, "30d": 30 }[expiresIn];
  return {
    label: formString(fd, "label").slice(0, 60) || "Shared view",
    visible_section_ids: fd.getAll("sections").filter((v): v is string => typeof v === "string" && z.uuid().safeParse(v).success),
    show_status: fd.get("show_status") === "on",
    show_links: fd.get("show_links") === "on",
    show_stats: fd.get("show_stats") === "on",
    // "keep" (edit form) leaves the expiry as it is; "never" clears it.
    ...(expiresIn && expiresIn !== "keep" ? { expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null } : {}),
  };
}

async function validSections(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], projectId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("sections").select("id").eq("project_id", projectId).in("id", ids);
  return (data ?? []).map((s) => s.id as string);
}

export async function createShare(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");
  const opts = shareOptions(fd);
  opts.visible_section_ids = await validSections(ctx.supabase, projectId, opts.visible_section_ids);
  if (opts.visible_section_ids.length === 0 && !opts.show_stats) return fail("Turn on at least one section or the stats.");

  const token = randomToken();
  const { error } = await ctx.supabase.from("share_links").insert({
    ...opts,
    project_id: projectId,
    owner_id: ctx.user.id,
    token_hash: sha256(token),
    token_ciphertext: encrypt(token),
  });
  if (error) return fail("Couldn't create the link. Try again.");
  revalidatePath(`/projects/${projectId}/share`);
  return { ok: "Link created. Anyone with it can view what you turned on.", url: `${appUrl()}/s/${token}` };
}

export async function updateShare(_: ActionState, fd: FormData): Promise<ActionState> {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return fail("Project not found.");
  const opts = shareOptions(fd);
  opts.visible_section_ids = await validSections(ctx.supabase, projectId, opts.visible_section_ids);
  await ctx.supabase.from("share_links").update(opts).eq("id", formString(fd, "share_id")).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}/share`);
  return { ok: "Updated. People with the link see the change right away." };
}

export async function getShareUrl(shareId: string, projectId: string): Promise<string | null> {
  const ctx = await ownedProject(projectId);
  if (!ctx || !z.uuid().safeParse(shareId).success) return null;
  // The token column isn't readable with the browser key; read it server-side
  // after confirming ownership above.
  const { data } = await createAdminClient()
    .from("share_links")
    .select("token_ciphertext")
    .eq("id", shareId)
    .eq("project_id", projectId)
    .eq("owner_id", ctx.user.id)
    .maybeSingle();
  return data ? `${appUrl()}/s/${decrypt(data.token_ciphertext)}` : null;
}

export async function revokeShare(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  await ctx.supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", formString(fd, "share_id"))
    .eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}/share`);
}

export async function deleteShare(fd: FormData) {
  const projectId = formString(fd, "project_id");
  const ctx = await ownedProject(projectId);
  if (!ctx) return;
  await ctx.supabase.from("share_links").delete().eq("id", formString(fd, "share_id")).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}/share`);
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const name = formString(fd, "full_name");
  if (!name || name.length > 80) return fail("Names are 1–80 characters.");
  await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function deleteAccount(fd: FormData) {
  const { supabase, user } = await requireUser();
  if (formString(fd, "confirm") !== "delete my account") redirect("/settings?error=confirm");
  // Every table cascades from auth.users, so this removes all of the user's data.
  await createAdminClient().auth.admin.deleteUser(user.id);
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
