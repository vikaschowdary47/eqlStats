import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { Lamp, buttonClass } from "@/components/ui";
import { PROVIDERS } from "@/lib/integrations/providers";

const DEMO_SERVICES = [
  { status: "ok", label: "Vercel · equal-tab", text: "Production is live." },
  { status: "ok", label: "Supabase · Backend", text: "Project is healthy." },
  { status: "down", label: "OpenAI", text: "Out of credit. Add funds in OpenAI billing." },
  { status: "warn", label: "eqltab.com", text: "Expires in 21 days at Porkbun." },
  { status: "ok", label: "Cloudflare · eqltab.com", text: "Zone is active on Cloudflare." },
  { status: "ok", label: "Anthropic", text: "Key is valid and has credit." },
] as const;

const SHARE_ROWS = [
  { name: "Frontend", on: true },
  { name: "Backend", on: true },
  { name: "Domains & infra", on: true },
  { name: "Money", on: false },
];

export default async function Landing() {
  const { user } = await getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-[19px] font-semibold">
          <Lamp status="ok" size={10} /> {BRAND.name}
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("ghost", "sm")}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "sm")}>
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero: the product's own instrument panel is the first thing you see */}
      <section className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1180px] gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-2 lg:items-center lg:pt-16">
        <div>
          <h1 className="text-[42px] font-semibold leading-[1.04] sm:text-[56px]">
            Stop hunting through consoles for your own project.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
            {BRAND.name} keeps every service, console link and note behind a project in one place, shows you what&apos;s
            broken before your users do, and shares exactly the parts you choose.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClass("primary")}>
              Create a free account
            </Link>
            <Link href="/login" className={buttonClass("secondary")}>
              Sign in
            </Link>
          </div>
        </div>

        <div className="plate p-5 pt-7 sm:p-7 sm:pt-9" aria-label="Example project status">
          <div className="flex items-center gap-3">
            <Lamp status="down" size={14} />
            <div>
              <p className="font-display text-[19px] font-semibold leading-tight">Something is failing</p>
              <p className="text-[13px] text-plate-ink-2">Equal Tab, last checked 2 min ago</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-px overflow-hidden rounded-lg bg-white/[0.06] sm:grid-cols-2">
            {DEMO_SERVICES.map((s, i) => (
              <li key={s.label} className="flex gap-3 bg-plate-2/70 px-4 py-3">
                <span className="pt-1.5">
                  <Lamp status={s.status} index={i} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{s.label}</span>
                  <span className="block text-[13px] leading-snug text-plate-ink-2">{s.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Capture */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1180px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-[32px] font-semibold sm:text-[38px]">Paste the link once. Find it forever.</h2>
            <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-ink-2">
              That Google Cloud page you configured this morning, three menus deep? Paste its URL and {BRAND.name} names it,
              files it under the right section, and keeps your setup notes next to it.
            </p>
          </div>
          <div className="rounded-xl bg-bg p-4 ring-1 ring-line">
            <p className="truncate rounded-lg bg-surface px-3 py-2.5 font-mono text-[13px] text-ink-3 ring-1 ring-line-strong">
              console.cloud.google.com/apis/api/gmail.googleapis.com/credentials?project=equal-tab
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface px-3 py-3 ring-1 ring-line">
              <span className="grid size-9 place-items-center rounded-lg bg-sunk font-mono text-[12px] font-semibold text-ink-2">GC</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">Gmail API · Credentials</p>
                <p className="truncate text-[13px] text-ink-3">Google Cloud, equal-tab</p>
              </div>
              <span className="rounded-md bg-sunk px-2 py-1 text-[12.5px] text-ink-2">Backend</span>
            </div>
            <p className="mt-3 rounded-lg bg-surface px-3 py-2.5 text-[13.5px] text-ink-2 ring-1 ring-line">
              Redirect URI is https://eqltab.com/api/auth/callback. Scopes: gmail.send.
            </p>
          </div>
        </div>
      </section>

      {/* Status + share */}
      <section className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1180px] gap-6 px-5 py-20 sm:px-8 lg:grid-cols-2">
        <div className="rounded-xl bg-surface p-7 ring-1 ring-line">
          <h2 className="text-[26px] font-semibold">Know before your users do</h2>
          <p className="mt-3 text-ink-2">
            Failed deploys, paused databases, expiring domains, and AI keys that are revoked or out of credit. Checked on a
            schedule, summarised in a sentence.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <li key={p.id} className="rounded-full bg-sunk px-3 py-1 text-[13px] text-ink-2">
                {p.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-surface p-7 ring-1 ring-line">
          <h2 className="text-[26px] font-semibold">Share exactly what you mean to</h2>
          <p className="mt-3 text-ink-2">
            Send a co-founder, client or investor a read-only link. Switch sections off, hide the raw console URLs, set an
            expiry, and turn it off whenever you like.
          </p>
          <ul className="mt-6 divide-y divide-line rounded-lg ring-1 ring-line" aria-label="Example share settings">
            {SHARE_ROWS.map((r) => (
              <li key={r.name} className="flex items-center justify-between px-4 py-2.5 text-[14px]">
                {r.name}
                <input type="checkbox" className="switch" defaultChecked={r.on} aria-label={`Show ${r.name}`} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-8">
        <div className="plate grid gap-6 px-7 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-[26px] font-semibold">Built to hold keys responsibly</h2>
            <p className="mt-2 max-w-[60ch] text-plate-ink-2">
              API tokens are encrypted with AES-256 before they&apos;re stored, can&apos;t be read back from the browser, and
              are only used to run status checks. Share links never include them.
            </p>
          </div>
          <Link href="/signup" className={buttonClass("plate")}>
            Create a free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-ink-3 sm:px-8">
          <span>
            {BRAND.name}. {BRAND.tagline}
          </span>
          <span>Made for people who ship.</span>
        </div>
      </footer>
    </div>
  );
}
