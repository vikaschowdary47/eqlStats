import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Lamp } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,520px)]">
      <aside className="relative hidden overflow-hidden bg-plate p-10 text-plate-ink lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Lamp status="ok" size={10} /> {BRAND.name}
        </Link>
        <div className="plate max-w-md !bg-plate-2 px-6 pb-6 pt-8">
          <p className="font-display text-[19px] font-semibold">All systems normal</p>
          <ul className="mt-4 space-y-3 text-[14px]">
            {[
              ["ok", "Vercel · Production is live."],
              ["ok", "Supabase · Project is healthy."],
              ["warn", "acme.dev · Expires in 21 days at Porkbun."],
              ["ok", "OpenAI · Key is valid and has credit."],
            ].map(([s, t], i) => (
              <li key={t} className="flex items-center gap-3">
                <Lamp status={s as "ok" | "warn"} index={i} />
                <span className="text-plate-ink-2">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="max-w-sm text-[14px] text-plate-ink-2">{BRAND.tagline}</p>
      </aside>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Link href="/" className="mb-10 flex items-center gap-2 font-display text-lg font-semibold lg:hidden">
          <Lamp status="ok" size={10} /> {BRAND.name}
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
