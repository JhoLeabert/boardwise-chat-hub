import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Status = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";

export const COLUMNS: { id: Status; title: string }[] = [
  { id: "todo", title: "To-Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "In Review" },
  { id: "done", title: "Completed" },
];

export const CATEGORIES = ["UI Design", "Frontend", "Backend", "QA", "Bug", "DevOps", "Documentation", "General"];

export const tasksQuery = {
  queryKey: ["tasks"],
  queryFn: async (): Promise<Task[]> => {
    const { data, error } = await supabase.from("tasks").select("*").order("position");
    if (error) throw error;
    return data;
  },
};

export const profileQuery = {
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    return { email: u.user.email ?? "", id: u.user.id, full_name: data?.full_name ?? "", avatar_url: data?.avatar_url ?? null };
  },
};

/** Percentage of tasks in the Completed column, rounded. */
export function completionPercent(tasks: Pick<Task, "status">[]): number {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100);
}

/** Position for an item inserted at `index` among sorted siblings (excluding itself). */
export function positionAt(siblings: { position: number }[], index: number): number {
  const prev = siblings[index - 1]?.position;
  const next = siblings[index]?.position;
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}
