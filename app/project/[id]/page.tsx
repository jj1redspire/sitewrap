import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import ProjectDetailClient from "./ProjectDetailClient";
import type { Project, PunchItem, ChangeOrder } from "@/types";

interface PageProps {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, itemsResult, changeOrdersResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("punch_items")
      .select("*")
      .eq("project_id", params.id)
      .order("item_number", { ascending: true }),
    supabase
      .from("change_orders")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (projectResult.error || !projectResult.data) {
    redirect("/dashboard");
  }

  const project = projectResult.data as Project;
  const initialItems = (itemsResult.data ?? []) as PunchItem[];
  const initialChangeOrders = (changeOrdersResult.data ?? []) as ChangeOrder[];

  return (
    <AppShell>
      <ProjectDetailClient
        project={project}
        initialItems={initialItems}
        initialChangeOrders={initialChangeOrders}
      />
    </AppShell>
  );
}
