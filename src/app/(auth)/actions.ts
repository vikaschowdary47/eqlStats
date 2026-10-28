"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
import { fail, formRaw, formString, safeNext, type ActionState } from "@/lib/action";

const email = z.email({ message: "Enter a valid email address." });
const password = z.string().min(8, { message: "Use at least 8 characters." }).max(72);

// Auth emails always link to the configured app URL, never to a request's Host
// header, so a forged header can't redirect someone's reset link elsewhere.
async function origin() {
  return appUrl();
}

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z.object({ email, password: z.string().min(1, { message: "Enter your password." }) }).safeParse({
    email: formString(fd, "email"),
    password: formRaw(fd, "password"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message)) return fail("Confirm your email first. Check your inbox for the link.");
    return fail("That email and password don't match.");
  }
  redirect(safeNext(formString(fd, "next")));
}

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = z
    .object({ name: z.string().min(1, { message: "Enter your name." }).max(80), email, password })
    .safeParse({ name: formString(fd, "name"), email: formString(fd, "email"), password: formRaw(fd, "password") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await origin()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return fail(error.message);
  if (data.session) redirect("/dashboard");
  return { ok: `We sent a confirmation link to ${parsed.data.email}. Open it to finish signing up.` };
}

export async function signInWithGitHub(fd: FormData) {
  const supabase = await createClient();
  const next = safeNext(formString(fd, "next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=github");
  redirect(data.url);
}

export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = email.safeParse(formString(fd, "email"));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists, so emails can't be probed.
  return { ok: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = password.safeParse(formRaw(fd, "password"));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (formRaw(fd, "password") !== formRaw(fd, "confirm")) return fail("The passwords don't match.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return fail("Your reset link has expired. Request a new one.");
  redirect("/dashboard");
}
