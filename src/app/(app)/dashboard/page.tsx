import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { listProjects } from "@/lib/data";
import { ProjectStudio } from "@/components/project-studio";
export const metadata: Metadata = { title: "Project studio" };
export default async function Dashboard() {
  const { supabase } = await getUser();
  return <ProjectStudio projects={await listProjects(supabase)} />;
}
