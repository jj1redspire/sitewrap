"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, MapPin, User, Clock, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectWithCounts extends Project {
  punch_items: { count: number }[];
  change_orders: { count: number }[];
}

const STATUS_STYLES = {
  active: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  archived: "bg-stone-100 text-stone-600",
};

export function ProjectsClient({
  initialProjects,
  userId,
}: {
  initialProjects: ProjectWithCounts[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    address: "",
    client_name: "",
    client_email: "",
    client_phone: "",
  });
  const [creating, setCreating] = useState(false);

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(search.toLowerCase())) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()))
  );

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...newProject, user_id: userId })
      .select("*, punch_items(count), change_orders(count)")
      .single();
    if (!error && data) {
      setProjects([data, ...projects]);
      setShowNewModal(false);
      setNewProject({ name: "", address: "", client_name: "", client_email: "", client_phone: "" });
      router.push(`/project/${data.id}`);
    }
    setCreating(false);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1C1917]">Projects</h1>
          <p className="text-stone-500 text-sm mt-1">{projects.length} total</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[#EA580C] text-white font-bold px-5 py-3 rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-2 min-h-[52px] text-base"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search projects, clients, addresses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C] bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-stone-400 text-lg mb-4">
            {search ? "No projects match your search." : "No projects yet."}
          </p>
          {!search && (
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-[#EA580C] text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-700 transition-colors min-h-[52px]"
            >
              Create Your First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const itemCount = project.punch_items?.[0]?.count ?? 0;
            const coCount = project.change_orders?.[0]?.count ?? 0;
            return (
              <button
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="bg-white rounded-2xl border border-stone-200 p-5 text-left hover:border-[#EA580C] hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-extrabold text-lg text-[#1C1917] leading-tight group-hover:text-[#EA580C] transition-colors">
                    {project.name}
                  </h2>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                        STATUS_STYLES[project.status]
                      }`}
                    >
                      {project.status}
                    </span>
                    <ChevronRight size={16} className="text-stone-300 group-hover:text-[#EA580C] transition-colors" />
                  </div>
                </div>

                {project.client_name && (
                  <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-1.5">
                    <User size={13} />
                    <span>{project.client_name}</span>
                  </div>
                )}
                {project.address && (
                  <div className="flex items-center gap-1.5 text-stone-500 text-sm mb-3">
                    <MapPin size={13} />
                    <span className="truncate">{project.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-stone-100">
                  <div className="text-center">
                    <p className="font-extrabold text-xl text-[#1C1917]">{itemCount}</p>
                    <p className="text-xs text-stone-500">Punch Items</p>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-xl text-[#1C1917]">{coCount}</p>
                    <p className="text-xs text-stone-500">Change Orders</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-xs text-stone-400">
                    <Clock size={12} />
                    <span>{formatDate(project.updated_at)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-[#1C1917] mb-6">New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  placeholder="Johnson Kitchen Remodel"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  placeholder="123 Main St, Portland, OR"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Client Name</label>
                <input
                  type="text"
                  value={newProject.client_name}
                  onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                  placeholder="Sarah Johnson"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Client Email</label>
                  <input
                    type="email"
                    value={newProject.client_email}
                    onChange={(e) => setNewProject({ ...newProject, client_email: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                    placeholder="sarah@..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Client Phone</label>
                  <input
                    type="tel"
                    value={newProject.client_phone}
                    onChange={(e) => setNewProject({ ...newProject, client_phone: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                    placeholder="(503) 555-..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 border border-stone-300 text-stone-700 font-bold py-3 rounded-xl hover:bg-stone-50 transition-colors min-h-[52px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProject.name.trim()}
                  className="flex-1 bg-[#EA580C] text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 min-h-[52px]"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
