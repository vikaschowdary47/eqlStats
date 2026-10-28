import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getProjectBundle } from "@/lib/data";
import { InstrumentPanel } from "@/components/instrument-panel";
import { StatsStrip } from "@/components/stats";
import { AddLink } from "@/components/add-link";
import { SectionGrid } from "@/components/sections";

export const metadata: Metadata = { title: "Overview" };

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const bundle = await getProjectBundle(supabase, id);
  if (!bundle) notFound();
  const { project, sections, resources, integrations, stats } = bundle;

  return (
    <div className="space-y-6">
      <InstrumentPanel projectId={project.id} integrations={integrations} />
      <StatsStrip stats={stats} />
      <AddLink projectId={project.id} sections={sections} />
      <SectionGrid sections={sections} resources={resources} integrations={integrations} mode={{ kind: "owner", projectId: project.id }} />
    </div>
  );
}
