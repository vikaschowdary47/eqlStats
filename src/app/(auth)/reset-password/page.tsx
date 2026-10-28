import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { updatePassword } from "../actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage() {
  const { user } = await getUser();
  if (!user) redirect("/login?error=link");
  return (
    <>
      <h1 className="text-[30px] font-semibold">Choose a new password</h1>
      <p className="mt-1 text-ink-2">For {user.email}</p>
      <ActionForm action={updatePassword} className="mt-8 space-y-4">
        <Field label="New password" htmlFor="password" help="At least 8 characters.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <SubmitButton pending="Saving…">Save password</SubmitButton>
      </ActionForm>
    </>
  );
}
