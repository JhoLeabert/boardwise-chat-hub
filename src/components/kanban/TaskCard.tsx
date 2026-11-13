import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, FileText, Loader, MessageCircle, MoreHorizontal, Pencil, Trash2, CalendarDays } from "lucide-react";
import type { Task } from "@/lib/tasks";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const prio: Record<string, string> = {
  low: "bg-tag-low-bg text-tag-low-fg",
  medium: "bg-tag-medium-bg text-tag-medium-fg",
  high: "bg-tag-high-bg text-tag-high-fg",
};

export function TaskCardView({ task, onEdit, onDelete, dragging }: { task: Task; onEdit?: () => void; onDelete?: () => void; dragging?: boolean }) {
  const done = task.status === "done";
  return (
    <div className={`group rounded-2xl border bg-card p-4 shadow-card transition ${dragging ? "rotate-2 shadow-lift ring-2 ring-primary/30" : "hover:-translate-y-0.5 hover:shadow-lift"}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${prio[task.priority]}`}>{task.priority}</span>
        <span className="rounded-md bg-tag-cat-bg px-2 py-0.5 text-xs font-medium text-tag-cat-fg">{task.category}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onPointerDown={(e) => e.stopPropagation()} aria-label="Menu tugas" className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted"><MoreHorizontal className="size-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h4 className="mt-3 font-semibold leading-snug">{task.title}</h4>
      {task.description && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{task.description}</p>}
      <div className="mt-4 border-t pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">{done ? <CheckCircle2 className="size-3.5 text-success" /> : <Loader className="size-3.5" />}{done ? "Done" : "Progress"}</span>
          <span className="font-medium text-foreground">{task.progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${task.progress}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {task.due_date && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{new Date(task.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
        <span className="ml-auto flex items-center gap-1"><FileText className="size-3.5" />{task.files}</span>
        <span className="flex items-center gap-1"><MessageCircle className="size-3.5" />{task.comments}</span>
      </div>
    </div>
  );
}

export function SortableTask(props: { task: Task; onEdit: () => void; onDelete: () => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: props.task.id, data: { type: "task", task: props.task } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? "rounded-2xl border-2 border-dashed border-primary/40 [&>*]:opacity-0" : ""}`}>
      <TaskCardView {...props} />
    </div>
  );
}
