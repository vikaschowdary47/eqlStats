import Link from "next/link";
import type { Metadata } from "next";
import { signIn } from "../actions";
import { GitHubButton } from "../github-button";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { safeNext } from "@/lib/action";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or request a new one.",
  github: "GitHub sign-in isn't available right now. Use email instead.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const dest = safeNext(next);
  return (
    <>
      <h1 className="text-[30px] font-semibold">Sign in</h1>
      <p className="mt-1 text-ink-2">Welcome back. Your projects are where you left them.</p>
      {error && ERRORS[error] ? (
        <p role="alert" className="mt-5 rounded-lg bg-down/10 px-3 py-2 text-sm text-down">
          {ERRORS[error]}
        </p>
      ) : null}

      <div className="mt-8 space-y-6">
        <GitHubButton next={dest} />
        <div className="flex items-center gap-3 text-[13px] text-ink-3">
          <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
        </div>
        <ActionForm action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={dest} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <div className="flex items-center justify-between">
            <SubmitButton pending="Signing in…">Sign in</SubmitButton>
            <Link href="/forgot-password" className="text-sm text-ink-2 hover:text-ink">
              Forgot password?
            </Link>
          </div>
        </ActionForm>
      </div>
      <p className="mt-10 text-sm text-ink-2">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
