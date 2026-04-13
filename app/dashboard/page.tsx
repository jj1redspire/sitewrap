import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import type { Project, PunchItem, ChangeOrder } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  bg,
  textColor = "text-white",
}: {
  label: string;
  value: number | string;
  bg: string;
  textColor?: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 flex flex-col justify-between min-h-[96px]`}>
      <p className={`text-sm font-medium leading-snug ${textColor} opacity-90`}>{label}</p>
      <p className={`text-3xl font-bold ${textColor} mt-2`}>{value}</p>
    </div>
  );
}

// ─── Activity feed item ────────────────────────────────────────────────────────

type ActivityItem = {
  id: string;
  type: "punch_item" | "change_order";
  projectName: string;
  description: string;
  status: string;
  updatedAt: string;
};

function statusBadge(type: ActivityItem["type"], status: string) {
  if (type === "punch_item") {
    const map: Record<string, string> = {
      open: "bg-red-100 text-red-700",
      in_progress: "bg-amber-100 text-amber-700",
      completed: "bg-green-100 text-green-700",
    };
    return map[status] ?? "bg-stone-100 text-stone-600";
  } else {
    const map: Record<string, string> = {
      draft: "bg-stone-100 text-stone-600",
      sent: "bg-amber-100 text-amber-700",
      signed: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return map[status] ?? "bg-stone-100 text-stone-600";
  }
}

function statusLabel(type: ActivityItem["type"], status: string): string {
  if (type === "punch_item") {
    return status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1);
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all data in parallel
  const [projectsRes, itemsRes, ordersRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("punch_items")
      .select("*, projects!inner(user_id, name)")
      .eq("projects.user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("change_orders")
      .select("*, projects!inner(user_id, name)")
      .eq("projects.user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const projects = (projectsRes.data ?? []) as Project[];
  const allItems = (itemsRes.data ?? []) as (PunchItem & { projects: { name: string } })[];
  const allOrders = (ordersRes.data ?? []) as (ChangeOrder & { projects: { name: string } })[];

  // ─── Stats ────────────────────────────────────────────────────────────────

  const openItems = allItems.filter((i) => i.status !== "completed").length;
  const pendingSig = allOrders.filter((o) => o.status === "sent").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  // Items completed this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const completedThisMonth = allItems.filter(
    (i) => i.status === "completed" && i.completed_at && i.completed_at >= monthStart
  ).length;

  // ─── Projects needing attention (has critical open items) ─────────────────

  const criticalOpenByProject: Record<string, { project: Project; count: number }> = {};
  for (const item of allItems) {
    if (item.severity === "critical" && item.status !== "completed") {
      const proj = projects.find((p) => p.id === item.project_id);
      if (!proj) continue;
      if (!criticalOpenByProject[proj.id]) {
        criticalOpenByProject[proj.id] = { project: proj, count: 0 };
      }
      criticalOpenByProject[proj.id].count++;
    }
  }
  const attentionProjects = Object.values(criticalOpenByProject).sort(
    (a, b) => b.count - a.count
  );

  // ─── Recent activity (last 10 items/orders combined) ─────────────────────

  const activityItems: ActivityItem[] = [
    ...allItems.slice(0, 20).map((i) => ({
      id: i.id,
      type: "punch_item" as const,
      projectName: i.projects?.name ?? "Unknown Project",
      description: i.description,
      status: i.status,
      updatedAt: i.created_at,
    })),
    ...allOrders.slice(0, 20).map((o) => ({
      id: o.id,
      type: "change_order" as const,
      projectName: o.projects?.name ?? "Unknown Project",
      description: o.description,
      status: o.status,
      updatedAt: o.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1917]">Dashboard</h1>
            <p className="text-stone-400 text-sm mt-0.5">Overview of all your projects</p>
          </div>
          <Link
            href="/projects/new"
            className="bg-[#EA580C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] flex items-center hover:bg-orange-700 transition-colors"
          >
            + New Project
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard
            label="Open Punch Items"
            value={openItems}
            bg="bg-red-600"
          />
          <StatCard
            label="Pending Signature"
            value={pendingSig}
            bg="bg-amber-500"
          />
          <StatCard
            label="Active Projects"
            value={activeProjects}
            bg="bg-[#1C1917]"
          />
          <StatCard
            label="Completed This Month"
            value={completedThisMonth}
            bg="bg-[#16A34A]"
          />
        </div>

        {/* Projects needing attention */}
        {attentionProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-[#1C1917] mb-3">Needs attention</h2>
            <div className="flex flex-col gap-2">
              {attentionProjects.map(({ project, count }) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="flex items-center justify-between bg-white border border-red-200 rounded-2xl px-4 py-3.5 hover:border-red-400 transition-colors min-h-[52px]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1C1917] text-sm truncate">{project.name}</p>
                    {project.address && (
                      <p className="text-xs text-stone-400 truncate mt-0.5">{project.address}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-3 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-red-600 font-bold text-sm">
                      {count} critical
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All projects (quick list) */}
        {projects.length > 0 && attentionProjects.length === 0 && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-[#1C1917] mb-3">Projects</h2>
            <div className="flex flex-col gap-2">
              {projects.slice(0, 5).map((project) => {
                const projectItems = allItems.filter((i) => i.project_id === project.id);
                const open = projectItems.filter((i) => i.status !== "completed").length;
                return (
                  <Link
                    key={project.id}
                    href={`/project/${project.id}`}
                    className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl px-4 py-3.5 hover:border-stone-300 transition-colors min-h-[52px]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1C1917] text-sm truncate">{project.name}</p>
                      {project.client_name && (
                        <p className="text-xs text-stone-400 mt-0.5">{project.client_name}</p>
                      )}
                    </div>
                    {open > 0 && (
                      <span className="ml-3 flex-shrink-0 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">
                        {open} open
                      </span>
                    )}
                  </Link>
                );
              })}
              {projects.length > 5 && (
                <Link
                  href="/projects"
                  className="text-center text-sm text-[#EA580C] font-semibold py-2 min-h-[44px] flex items-center justify-center"
                >
                  View all {projects.length} projects →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Recent activity */}
        <section>
          <h2 className="text-base font-bold text-[#1C1917] mb-3">Recent activity</h2>

          {activityItems.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl">
              <p className="text-stone-400 font-medium">No activity yet</p>
              <p className="text-stone-300 text-sm mt-1">Start a walk to add your first punch items</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activityItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white border border-stone-200 rounded-2xl px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-stone-400 font-medium truncate">
                          {item.projectName}
                        </span>
                        <span className="text-xs text-stone-300 flex-shrink-0">·</span>
                        <span className="text-xs text-stone-400 flex-shrink-0">
                          {item.type === "punch_item" ? "Punch" : "CO"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#1C1917] leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-semibold rounded-full px-2 py-0.5 capitalize ${statusBadge(item.type, item.status)}`}
                      >
                        {statusLabel(item.type, item.status)}
                      </span>
                      <span className="text-xs text-stone-300">{timeAgo(item.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
                <rect x="4" y="4" width="20" height="20" rx="3" stroke="#d6d3d1" strokeWidth="2" />
                <path d="M9 14h10M14 9v10" stroke="#d6d3d1" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-semibold text-stone-600 mb-1">No projects yet</p>
            <p className="text-stone-400 text-sm mb-5">Create your first project to get started</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center bg-[#EA580C] text-white rounded-xl px-5 py-3 font-semibold text-sm min-h-[52px]"
            >
              Create First Project
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
