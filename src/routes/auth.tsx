import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import art from "@/assets/auth-art.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Flowboard" },
      { name: "description", content: "Masuk atau daftar untuk mengakses papan kanban Flowboard." },
      { property: "og:title", content: "Masuk — Flowboard" },
      { property: "og:description", content: "Masuk atau daftar untuk mengakses papan kanban Flowboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang kembali!");
        navigate({ to: "/board" });
      } else {
        if (password.length < 6) throw new Error("Kata sandi minimal 6 karakter");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/board" });
        else { toast.success("Cek email kamu untuk konfirmasi akun."); setMode("login"); }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally { setLoading(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <img src={art} alt="" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12 text-sidebar-primary">
          <div className="flex items-center gap-2 text-2xl font-bold"><Gem className="size-7" /> Flowboard</div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-tight">Atur pekerjaan tim, tanpa ribet.</h2>
            <p className="mt-4 text-sidebar-foreground">Drag & drop tugas, pantau progres, dan tanya asisten AI kapan saja.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-aurora px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-lift">
          <div className="mb-8">
            <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"><Gem className="size-6" /></div>
            <h1 className="text-3xl font-bold tracking-tight">{mode === "login" ? "Masuk ke akun" : "Buat akun baru"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{mode === "login" ? "Lanjutkan ke papan kanban kamu." : "Mulai kelola proyek dalam hitungan detik."}</p>
          </div>
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`rounded-lg py-2 transition ${mode === m ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>
                {m === "login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field icon={User} label="Nama lengkap" id="name">
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi Santoso" className="h-11 pl-10" />
              </Field>
            )}
            <Field icon={Mail} label="Email" id="email">
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" className="h-11 pl-10" />
            </Field>
            <Field icon={Lock} label="Kata sandi" id="password">
              <Input id="password" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 px-10" />
              <button type="button" aria-label="Tampilkan kata sandi" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </Field>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-base shadow-glow">
              {loading && <Loader2 className="animate-spin" />} {mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, id, children }: { icon: typeof Mail; label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
