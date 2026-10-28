import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { Lamp, buttonClass } from "@/components/ui";
import { NavLink } from "@/components/nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const [projects, { data: profile }] = await Promise.all([
    listProjects(supabase),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const name = profile?.full_name || user.email;

  const nav = (
    <>
      <p className="px-3 text-[12.5px] font-medium text-ink-3">Projects</p>
      <ul className="mt-1.5 space-y-0.5">
        {projects.map((p) => (
          <li key={p.id}>
            <NavLink href={`/projects/${p.id}`} match="prefix">
              <Lamp status={p.status} size={8} />
              <span className="truncate">{p.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <Link href="/projects/new" className={buttonClass("secondary", "sm") + " mt-3 w-full"}>
        New project
      </Link>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bg px-3 py-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-3 font-display text-[18px] font-semibold">
          <Lamp status="ok" size={9} /> {BRAND.name}
        </Link>
        <nav className="mt-7 flex-1 overflow-y-auto" aria-label="Projects">
          <NavLink href="/dashboard">All projects</NavLink>
          <div className="mt-5">{nav}</div>
        </nav>
        <div className="border-t border-line pt-3">
          <NavLink href="/settings">
            <span className="truncate">{name}</span>
          </NavLink>
          <form action="/auth/signout" method="post">
            <button className="w-full rounded-lg px-3 py-1.5 text-left text-[14px] text-ink-3 hover:bg-sunk hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-[17px] font-semibold">
          <Lamp status="ok" size={9} /> {BRAND.name}
        </Link>
        <details className="relative">
          <summary className={buttonClass("secondary", "sm")}>Menu</summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface p-3 shadow-lg ring-1 ring-line">
            <NavLink href="/dashboard">All projects</NavLink>
            <div className="mt-3">{nav}</div>
            <div className="mt-3 border-t border-line pt-2">
              <NavLink href="/settings">Account</NavLink>
              <form action="/auth/signout" method="post">
                <button className="w-full rounded-lg px-3 py-1.5 text-left text-[14px] text-ink-3 hover:bg-sunk">Sign out</button>
              </form>
            </div>
          </div>
        </details>
      </header>

      <main className="min-w-0 px-4 pb-24 pt-6 sm:px-8 lg:px-10 lg:pt-9">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}
