import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Trash2, X, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import bot from "@/assets/bot.png";

type Msg = { id: string; role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["Tugas apa yang prioritas tinggi?", "Ringkas progres proyek", "Apa yang harus saya kerjakan hari ini?", "Tugas mana yang hampir tenggat?"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming">("idle");
  const [loaded, setLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!open || loaded) return;
    supabase.from("chat_messages").select("id, role, content").order("created_at").then(({ data, error }) => {
      if (error) toast.error("Gagal memuat riwayat chat");
      setMsgs((data ?? []) as Msg[]); setLoaded(true);
    });
  }, [open, loaded]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, status]);
  useEffect(() => { if (open && status === "idle") taRef.current?.focus(); }, [open, status]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || status !== "idle") return;
    setInput("");
    const aid = crypto.randomUUID();
    setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", content: message }]);
    setStatus("submitted");
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", { method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ message }) });
      if (!res.ok || !res.body) throw new Error(await res.text() || "Gagal");
      const reader = res.body.getReader(); const dec = new TextDecoder();
      setMsgs((m) => [...m, { id: aid, role: "assistant", content: "" }]);
      setStatus("streaming");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMsgs((m) => m.map((x) => x.id === aid ? { ...x, content: x.content + chunk } : x));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
    } finally { setStatus("idle"); abortRef.current = null; }
  }

  async function clear() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase.from("chat_messages").delete().eq("user_id", data.user.id);
    if (error) toast.error(error.message); else { setMsgs([]); qc.invalidateQueries({ queryKey: ["chat"] }); toast.success("Riwayat dihapus"); }
  }

  return (
    <>
      <button onClick={() => setOpen((o) => !o)} aria-label="Buka asisten AI"
        className="fixed bottom-6 right-6 z-50 flex size-16 items-center justify-center rounded-full bg-chat shadow-glow transition hover:scale-105">
        {!open && <span className="absolute inset-0 rounded-full bg-primary/40 animate-ring" />}
        {open ? <X className="relative size-6 text-primary-foreground" /> : <img src={bot} alt="" width={56} height={56} className="relative size-12 animate-float" />}
      </button>

      <div className={`fixed bottom-28 right-6 z-50 flex h-[min(640px,calc(100vh-9rem))] w-[min(420px,calc(100vw-3rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border shadow-lift transition-all duration-300 glass ${open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}>
        <div className="relative overflow-hidden bg-chat px-5 pb-5 pt-4 text-primary-foreground">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary-glow/30 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-2xl bg-primary-foreground/15 p-1 backdrop-blur"><img src={bot} alt="" width={44} height={44} className="size-11" /></div>
            <div className="flex-1">
              <p className="font-bold">Flo — Asisten AI</p>
              <p className="flex items-center gap-1.5 text-xs opacity-80"><span className="size-2 rounded-full bg-success" /> Online · paham isi board kamu</p>
            </div>
            <button onClick={clear} aria-label="Hapus riwayat" className="rounded-xl p-2 hover:bg-primary-foreground/15"><Trash2 className="size-4" /></button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {loaded && msgs.length === 0 && (
            <div className="pt-4 text-center">
              <img src={bot} alt="" width={80} height={80} className="mx-auto size-20 animate-float" loading="lazy" />
              <p className="mt-3 font-semibold">Hai! Aku Flo 👋</p>
              <p className="text-sm text-muted-foreground">Tanyakan apa saja tentang tugas di papan kamu.</p>
              <div className="mt-5 grid gap-2">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-xl border bg-card px-4 py-2.5 text-left text-sm transition hover:border-primary hover:text-primary">{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m) => m.role === "user" ? (
            <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-primary px-4 py-2.5 text-sm text-primary-foreground shadow-card">{m.content}</div></div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <img src={bot} alt="" width={28} height={28} className="mt-0.5 size-7 shrink-0" />
              <div className="prose prose-sm max-w-[85%] text-sm text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2.5">
              <img src={bot} alt="" width={28} height={28} className="size-7" />
              <div className="flex gap-1 rounded-2xl bg-muted px-4 py-3">{[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-full bg-primary animate-typing" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t bg-card/80 p-3">
          <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 focus-within:ring-2 focus-within:ring-primary/30">
            <textarea ref={taRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tanya Flo..." disabled={status !== "idle"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none" />
            {status === "idle" ? (
              <button type="submit" disabled={!input.trim()} aria-label="Kirim" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground disabled:opacity-40"><ArrowUp className="size-4" /></button>
            ) : (
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Berhenti" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background"><Square className="size-3.5" /></button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
