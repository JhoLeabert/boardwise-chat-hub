import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gem, LayoutDashboard, ListChecks, FolderKanban, FileText, Users, CalendarDays, Settings, LogOut, Folder, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function initials(name?: string) {
  return (name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useQuery(profileQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: ListChecks, label: "Tasks" },
    { icon: FolderKanban, label: "Projects", to: "/board" as const },
    { icon: FileText, label: "Documents" },
    { icon: Users, label: "Team" },
    { icon: CalendarDays, label: "Calendar" },
  ];

  return (
    <div className="flex h-screen bg-sidebar">
      <aside className="hidden w-64 shrink-0 flex-col px-4 py-6 text-sidebar-foreground md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 text-xl font-bold text-sidebar-primary"><Gem className="size-6" /> Flowboard</div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider opacity-60">Main menu</p>
        <nav className="space-y-1">
          {nav.map((n) => n.to ? (
            <Link key={n.label} to={n.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}>
              <n.icon className="size-4" /> {n.label}
            </Link>
          ) : (
            <div key={n.label} className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-70"><n.icon className="size-4" /> {n.label}</div>
          ))}
        </nav>
        <div className="my-6 border-t border-sidebar-border" />
        <p className="mb-2 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider opacity-60">Starred project <Plus className="size-3.5" /></p>
        <Link to="/board" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-accent-foreground"><Folder className="size-4" /> Takata Project</Link>
        <div className="my-6 border-t border-sidebar-border" />
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider opacity-60">Tag</p>
        {[["Meeting", "bg-warning"], ["Payment", "bg-success"], ["Client's Report", "bg-destructive"]].map(([t, c]) => (
          <div key={t} className="flex items-center gap-3 px-3 py-2 text-sm"><span className={`size-2 rounded-full ${c}`} /> {t}</div>
        ))}
        <div className="mt-auto space-y-1">
          <Link to="/profile" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent" }}><Settings className="size-4" /> Pengaturan Profil</Link>
          <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent p-3">
            <Avatar className="size-9"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback>{initials(profile?.full_name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{profile?.full_name}</p>
              <p className="truncate text-xs opacity-70">{profile?.email}</p>
            </div>
            <button onClick={signOut} aria-label="Keluar" className="rounded-lg p-1.5 hover:bg-sidebar"><LogOut className="size-4" /></button>
          </div>
        </div>
      </aside>
      <main className="my-2 mr-2 flex-1 overflow-hidden rounded-3xl bg-card md:ml-0 ml-2">
        <div className="h-full overflow-auto">{children}</div>
      </main>
      <ChatWidget />
    </div>
  );
}
