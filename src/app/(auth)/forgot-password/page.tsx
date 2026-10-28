import Link from "next/link";
import type { Metadata } from "next";
import { requestPasswordReset } from "../actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-[30px] font-semibold">Reset your password</h1>
      <p className="mt-1 text-ink-2">We&apos;ll email you a link to choose a new one.</p>
      <ActionForm action={requestPasswordReset} className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton pending="Sending…">Send reset link</SubmitButton>
      </ActionForm>
      <p className="mt-10 text-sm">
        <Link href="/login" className="text-ink-2 hover:text-ink">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
