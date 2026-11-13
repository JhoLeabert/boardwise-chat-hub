import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Flowboard — Kanban Interaktif" },
      { name: "description", content: "Kelola tugas tim dengan papan kanban modern dan asisten AI." },
      { property: "og:title", content: "Flowboard — Kanban Interaktif" },
      { property: "og:description", content: "Kelola tugas tim dengan papan kanban modern dan asisten AI." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/board" : "/auth" });
  },
});
