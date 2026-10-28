import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { NavTabs } from "@/components/nav-tabs";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await getUser();
  const { data: project } = await supabase.from("projects").select("id, name, description, website_url").eq("id", id).maybeSingle();
  if (!project) notFound();

  const host = project.website_url ? new URL(project.website_url).hostname : null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[30px] font-semibold sm:text-[34px]">{project.name}</h1>
          <p className="mt-0.5 text-ink-2">
            {project.description}
            {host ? (
              <>
                {project.description ? " " : ""}
                <a href={project.website_url!} target="_blank" rel="noopener noreferrer" className="font-mono text-[13.5px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
                  {host}
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
      <NavTabs
        tabs={[
          { href: `/projects/${id}`, label: "Overview" },
          { href: `/projects/${id}/integrations`, label: "Services" },
          { href: `/projects/${id}/share`, label: "Share" },
          { href: `/projects/${id}/settings`, label: "Settings" },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}
