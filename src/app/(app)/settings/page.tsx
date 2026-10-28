import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { deleteAccount, updateProfile } from "../actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, PageHeader, Panel } from "@/components/ui";

export const metadata: Metadata = { title: "Account" };

export default async function AccountSettings({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { supabase, user } = await getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
  const providers = (user!.app_metadata?.providers as string[] | undefined) ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Account" />
      <Panel title="Profile">
        <ActionForm action={updateProfile} className="space-y-4 p-5">
          <Field label="Name" htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} maxLength={80} required />
          </Field>
          <Field label="Email" htmlFor="email" help={providers.length ? `Signs in with ${providers.join(" and ")}.` : undefined}>
            <Input id="email" value={user!.email ?? ""} readOnly disabled />
          </Field>
          <SubmitButton>Save changes</SubmitButton>
        </ActionForm>
      </Panel>

      <Panel title="Password">
        <div className="p-5 text-[14px] text-ink-2">
          To change your password, we&apos;ll email you a reset link.{" "}
          <Link href="/forgot-password" className="font-medium text-ink underline underline-offset-4">
            Send a reset link
          </Link>
        </div>
      </Panel>

      <Panel title="Delete account" description="Deletes your account and every project, link, stored key and share link. This can't be undone.">
        <form action={deleteAccount} className="space-y-3 p-5">
          <Field label="Type delete my account to confirm" htmlFor="confirm">
            <Input id="confirm" name="confirm" autoComplete="off" required />
          </Field>
          {error === "confirm" ? (
            <p role="alert" className="text-sm text-down">
              The text didn&apos;t match. Nothing was deleted.
            </p>
          ) : null}
          <SubmitButton variant="danger" pending="Deleting…">
            Delete account
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
