import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { StudioShell } from "@/components/project-studio";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <StudioShell name={profile?.full_name || user.email || "Your account"}>
      {children}
    </StudioShell>
  );
}
