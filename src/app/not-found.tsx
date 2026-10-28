import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <span className="lamp" data-status="unknown" style={{ ["--size" as string]: "14px" }} />
      <h1 className="mt-5 text-3xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-ink-2">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className="mt-6 text-sm font-medium underline underline-offset-4">
        Go to your projects
      </Link>
    </main>
  );
}
