import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Star, Plus, Search, LayoutGrid, CalendarDays, GanttChart, List, Circle, Loader2, RefreshCw, CheckCheck, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SortableTask, TaskCardView } from "@/components/kanban/TaskCard";
import { TaskDialog, type TaskDraft } from "@/components/kanban/TaskDialog";
import { COLUMNS, completionPercent, positionAt, tasksQuery, type Status, type Task } from "@/lib/tasks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({ meta: [
    { title: "Papan Kanban — Flowboard" },
    { name: "description", content: "Papan kanban interaktif untuk proyek kamu." },
    { property: "og:title", content: "Papan Kanban — Flowboard" },
    { property: "og:description", content: "Papan kanban interaktif untuk proyek kamu." },
  ] }),
  component: BoardPage,
});

const colIcon = { todo: Circle, in_progress: Loader2, review: RefreshCw, done: CheckCheck } as const;
const blank = (status: Status): TaskDraft => ({ title: "", description: "", priority: "medium", category: "General", progress: 0, status, due_date: null });

function BoardPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(tasksQuery);
  const [items, setItems] = useState<Task[]>([]);
  useEffect(() => setItems(data), [data]);
  const [search, setSearch] = useState("");
  const [prio, setPrio] = useState<string>("all");
  const [active, setActive] = useState<Task | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; draft: TaskDraft; id?: string }>({ open: false, draft: blank("todo") });
  const [toDelete, setToDelete] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const visible = useMemo(() => items.filter((t) =>
    (prio === "all" || t.priority === prio) && (t.title + t.description).toLowerCase().includes(search.toLowerCase())), [items, prio, search]);
  const byCol = (s: Status) => visible.filter((t) => t.status === s).sort((a, b) => a.position - b.position);
  const pct = completionPercent(items);

  const findCol = (id: string): Status | undefined => (COLUMNS.find((c) => c.id === id)?.id) ?? (items.find((t) => t.id === id)?.status as Status | undefined);

  function onDragStart(e: DragStartEvent) { setActive(items.find((t) => t.id === e.active.id) ?? null); }
  function onDragOver(e: DragOverEvent) {
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const to = findCol(overId); const from = findCol(e.active.id as string);
    if (!to || to === from) return;
    setItems((prev) => prev.map((t) => t.id === e.active.id ? { ...t, status: to } : t));
  }
  async function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const id = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    const task = items.find((t) => t.id === id);
    if (!task || !overId) { setItems(data); return; }
    const col = findCol(overId) ?? (task.status as Status);
    const siblings = items.filter((t) => t.status === col && t.id !== id).sort((a, b) => a.position - b.position);
    let index = siblings.findIndex((t) => t.id === overId);
    if (index === -1) index = siblings.length;
    else {
      const orig = data.find((t) => t.id === id);
      const overOrig = data.find((t) => t.id === overId);
      if (orig && overOrig && orig.status === col && orig.position < overOrig.position) index += 1;
    }
    const position = positionAt(siblings, index);
    const progress = col === "done" ? 100 : task.progress === 100 ? 90 : task.progress;
    const updated = { ...task, status: col, position, progress };
    setItems((prev) => prev.map((t) => t.id === id ? updated : t));
    qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => t.id === id ? updated : t));
    const { error } = await supabase.from("tasks").update({ status: col, position, progress }).eq("id", id);
    if (error) { toast.error("Gagal memindahkan tugas"); qc.invalidateQueries({ queryKey: ["tasks"] }); }
    else if (col !== task.status || col !== data.find((t) => t.id === id)?.status) toast.success(`Dipindah ke ${COLUMNS.find((c) => c.id === col)?.title}`);
  }

  async function save(d: TaskDraft) {
    if (dialog.id) {
      const { error } = await supabase.from("tasks").update(d).eq("id", dialog.id);
      if (error) { toast.error(error.message); throw error; }
      toast.success("Tugas diperbarui");
    } else {
      const last = items.filter((t) => t.status === d.status).reduce((m, t) => Math.max(m, t.position), 0);
      const { error } = await supabase.from("tasks").insert({ ...d, position: last + 1 });
      if (error) { toast.error(error.message); throw error; }
      toast.success("Tugas ditambahkan");
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("tasks").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message); else toast.success("Tugas dihapus");
    setToDelete(null);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  const edit = (t: Task) => setDialog({ open: true, id: t.id, draft: { title: t.title, description: t.description, priority: t.priority, category: t.category, progress: t.progress, status: t.status, due_date: t.due_date } });

  return (
    <AppShell>
      <header className="flex items-center gap-3 border-b px-6 py-4 text-sm">
        <ChevronLeft className="size-4 text-muted-foreground" /><ChevronRight className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Projects</span><span className="text-muted-foreground">/</span><span className="font-medium">Takata Project</span>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tugas..." className="h-9 rounded-xl pl-9" />
        </div>
        <button aria-label="Notifikasi" className="rounded-xl border p-2"><Bell className="size-4" /></button>
      </header>

      <section className="px-6 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">T</div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">Takata Project <Star className="size-5 fill-warning text-warning" /></h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><span className="relative size-4 rounded-full" style={{ background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0)` }} />{pct}% completed</span>
              <span>Tugas: <b className="text-foreground">{items.length}</b></span>
              <span>Client: <b className="text-foreground">Nozel Silva</b></span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border bg-muted/50 p-1 text-sm">
            {[[LayoutGrid, "Kanban"], [CalendarDays, "Calendar"], [GanttChart, "Gantt"], [List, "List"]].map(([I, l], i) => {
              const Icon = I as typeof List;
              return <span key={l as string} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${i === 0 ? "bg-card font-medium shadow-card" : "text-muted-foreground"}`}><Icon className="size-4" />{l as string}</span>;
            })}
          </div>
          <div className="flex gap-1 rounded-xl border p-1 text-xs font-medium">
            {["all", "low", "medium", "high"].map((p) => (
              <button key={p} onClick={() => setPrio(p)} className={`rounded-lg px-3 py-1.5 capitalize transition ${prio === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{p === "all" ? "Semua" : p}</button>
            ))}
          </div>
          <Button onClick={() => setDialog({ open: true, draft: blank("todo") })} className="ml-auto rounded-xl bg-foreground text-background hover:bg-foreground/90"><Plus /> Tugas Baru</Button>
        </div>
      </section>

      {isLoading ? <div className="flex justify-center p-20"><Loader2 className="size-6 animate-spin text-primary" /></div> : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActive(null); setItems(data); }}>
          <div className="grid min-w-[1000px] grid-cols-4 gap-4 p-6">
            {COLUMNS.map((c) => (
              <Column key={c.id} id={c.id} title={c.title} tasks={byCol(c.id)} onAdd={() => setDialog({ open: true, draft: blank(c.id) })} onEdit={edit} onDelete={setToDelete} />
            ))}
          </div>
          <DragOverlay>{active && <TaskCardView task={active} dragging />}</DragOverlay>
        </DndContext>
      )}

      <TaskDialog open={dialog.open} onOpenChange={(o) => setDialog((p) => ({ ...p, open: o }))} initial={dialog.draft} onSave={save} />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus tugas?</AlertDialogTitle><AlertDialogDescription>"{toDelete?.title}" akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive">Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Column({ id, title, tasks, onAdd, onEdit, onDelete }: { id: Status; title: string; tasks: Task[]; onAdd: () => void; onEdit: (t: Task) => void; onDelete: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const Icon = colIcon[id];
  return (
    <div ref={setNodeRef} className={`flex flex-col rounded-3xl bg-muted/60 p-3 transition ${isOver ? "ring-2 ring-primary/40" : ""}`}>
      <div className="mb-3 flex items-center gap-2 px-1 font-semibold">
        <Icon className={`size-4 ${id === "done" ? "text-success" : id === "review" ? "text-warning" : "text-primary"}`} /> {title}
        <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{tasks.length}</span>
        <button onClick={onAdd} aria-label={`Tambah ke ${title}`} className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-card"><Plus className="size-4" /></button>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-24 flex-col gap-3">
          {tasks.map((t) => <SortableTask key={t.id} task={t} onEdit={() => onEdit(t)} onDelete={() => onDelete(t)} />)}
        </div>
      </SortableContext>
      <button onClick={onAdd} className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/50 py-2.5 text-sm font-medium text-primary transition hover:bg-accent">
        <Plus className="size-4" /> Add Task
      </button>
    </div>
  );
}
