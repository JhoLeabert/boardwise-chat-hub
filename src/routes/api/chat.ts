import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { streamResponse, GatewayError } from "@lovable.dev/ai-gateway";
import type { Database } from "@/integrations/supabase/types";

function userClient(token: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => { const h = new Headers(init?.headers); h.set("apikey", key); return fetch(input, { ...init, headers: h }); },
    },
  });
}

const labels: Record<string, string> = { todo: "To-Do", in_progress: "In Progress", review: "In Review", done: "Completed" };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = userClient(token);
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as { message?: string };
        const message = (body.message ?? "").trim().slice(0, 4000);
        if (!message) return new Response("Bad request", { status: 400 });

        const { error: insErr } = await sb.from("chat_messages").insert({ role: "user", content: message, user_id: u.user.id });
        if (insErr) return new Response(insErr.message, { status: 500 });

        const [{ data: history }, { data: tasks }, { data: profile }] = await Promise.all([
          sb.from("chat_messages").select("role, content").order("created_at").limit(40),
          sb.from("tasks").select("title, description, status, priority, category, progress, due_date"),
          sb.from("profiles").select("full_name").eq("id", u.user.id).maybeSingle(),
        ]);
        const board = (tasks ?? []).map((t) => `- [${labels[t.status] ?? t.status}] "${t.title}" | prioritas ${t.priority} | ${t.category} | progress ${t.progress}%${t.due_date ? ` | tenggat ${t.due_date}` : ""}${t.description ? ` — ${t.description}` : ""}`).join("\n");

        const instructions = `Kamu adalah "Flo", asisten AI di aplikasi kanban Flowboard. Jawab ramah, ringkas, dan gunakan markdown (list, bold). Gunakan bahasa yang sama dengan pengguna (default Bahasa Indonesia). Nama pengguna: ${profile?.full_name ?? "teman"}. Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.
Berikut isi papan kanban pengguna saat ini (${tasks?.length ?? 0} tugas):
${board || "(kosong)"}
Gunakan data ini untuk menjawab pertanyaan tentang tugas, progres, prioritas, dan saran pengerjaan. Jangan mengarang tugas yang tidak ada.`;

        const input = (history ?? []).map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));

        let stream;
        try {
          stream = await streamResponse({ model: "openai/gpt-6-astra", instructions, input });
        } catch (e) {
          const msg = e instanceof GatewayError && e.httpStatus === 429 ? "Terlalu banyak permintaan, coba lagi sebentar." : e instanceof GatewayError && e.httpStatus === 402 ? "Kredit AI habis." : "AI sedang tidak tersedia.";
          return new Response(msg, { status: 502 });
        }

        const enc = new TextEncoder();
        const out = new ReadableStream({
          async start(controller) {
            let full = "";
            try {
              for await (const ev of stream) {
                if (ev.type === "response.output_text.delta") { full += ev.delta; controller.enqueue(enc.encode(ev.delta)); }
              }
              if (full) {
                const { error } = await sb.from("chat_messages").insert({ role: "assistant", content: full, user_id: u.user!.id });
                if (error) console.error("save assistant failed", error);
              }
            } catch (e) {
              console.error(e);
              controller.enqueue(enc.encode("\n\n_Maaf, terjadi kesalahan saat menjawab._"));
            } finally { controller.close(); }
          },
        });
        return new Response(out, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" } });
      },
    },
  },
});
