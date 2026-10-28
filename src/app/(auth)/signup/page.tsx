import Link from "next/link";
import type { Metadata } from "next";
import { signUp } from "../actions";
import { GitHubButton } from "../github-button";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-[30px] font-semibold">Create your account</h1>
      <p className="mt-1 text-ink-2">Free while in beta. Takes about a minute.</p>
      <div className="mt-8 space-y-6">
        <GitHubButton />
        <div className="flex items-center gap-3 text-[13px] text-ink-3">
          <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
        </div>
        <ActionForm action={signUp} className="space-y-4">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required maxLength={80} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" help="At least 8 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <SubmitButton pending="Creating account…">Create account</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-10 text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
