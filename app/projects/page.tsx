import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ProjectsClient } from "./ProjectsClient";

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("*, punch_items(count), change_orders(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <AppShell>
      <ProjectsClient initialProjects={projects ?? []} userId={user.id} />
    </AppShell>
  );
}
