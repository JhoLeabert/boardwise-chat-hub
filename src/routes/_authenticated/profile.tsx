import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, initials } from "@/components/AppShell";
import { profileQuery } from "@/lib/tasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Profil — Flowboard" },
    { name: "description", content: "Ubah nama dan foto profil kamu." },
    { property: "og:title", content: "Profil — Flowboard" },
    { property: "og:description", content: "Ubah nama dan foto profil kamu." },
  ] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: p } = useQuery(profileQuery);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (p) setName(p.full_name); }, [p]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault(); if (!p) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, updated_at: new Date().toISOString() }).eq("id", p.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Profil disimpan"); qc.invalidateQueries({ queryKey: ["profile"] }); }
  }
  async function upload(file: File) {
    if (!p) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Maksimal 3MB"); return; }
    setBusy(true);
    try {
      const path = `${p.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed, error: e2 } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", p.id);
      if (e3) throw e3;
      toast.success("Foto diperbarui");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal unggah"); }
    finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl p-10">
        <h1 className="text-2xl font-bold">Pengaturan Profil</h1>
        <p className="text-sm text-muted-foreground">Nama dan foto ini tampil di sidebar.</p>
        <div className="mt-8 rounded-3xl border p-8 shadow-card">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="size-24"><AvatarImage src={p?.avatar_url ?? undefined} className="object-cover" /><AvatarFallback className="text-2xl">{initials(p?.full_name)}</AvatarFallback></Avatar>
              <button onClick={() => fileRef.current?.click()} aria-label="Ganti foto" className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-glow"><Camera className="size-4" /></button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
            <div><p className="font-semibold">{p?.full_name}</p><p className="text-sm text-muted-foreground">{p?.email}</p></div>
          </div>
          <form onSubmit={saveName} className="mt-8 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="pname">Nama lengkap</Label><Input id="pname" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <Button disabled={busy} className="bg-gradient-primary">{busy && <Loader2 className="animate-spin" />} Simpan</Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
