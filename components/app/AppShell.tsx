"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { LayoutGrid, BarChart2, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/projects", label: "Projects", icon: LayoutGrid },
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-content mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/projects">
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-4">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                  pathname.startsWith(href)
                    ? "bg-orange-50 text-[#EA580C]"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors min-h-[44px]"
              aria-label="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
