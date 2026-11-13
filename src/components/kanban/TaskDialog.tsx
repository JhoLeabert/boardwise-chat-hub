import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, COLUMNS, type Task } from "@/lib/tasks";

export type TaskDraft = Pick<Task, "title" | "description" | "priority" | "category" | "progress" | "status" | "due_date">;

export function TaskDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; initial: TaskDraft; onSave: (d: TaskDraft) => Promise<void> }) {
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setD(initial); }, [open, initial]);
  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader><DialogTitle>{initial.title ? "Edit tugas" : "Tugas baru"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await onSave(d); onOpenChange(false); } finally { setSaving(false); } }}>
          <div className="space-y-1.5"><Label htmlFor="t-title">Judul</Label><Input id="t-title" required value={d.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="t-desc">Deskripsi</Label><Textarea id="t-desc" rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Prioritas</Label>
              <Select value={d.priority} onValueChange={(v) => set("priority", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Kategori</Label>
              <Select value={d.category} onValueChange={(v) => set("category", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={d.status} onValueChange={(v) => set("status", v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="t-due">Tenggat</Label><Input id="t-due" type="date" value={d.due_date ?? ""} onChange={(e) => set("due_date", e.target.value || null)} /></div>
          </div>
          <div className="space-y-3"><Label>Progress: {d.progress}%</Label><Slider value={[d.progress]} max={100} step={1} onValueChange={([v]) => set("progress", v ?? 0)} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={saving} className="bg-gradient-primary">Simpan</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
