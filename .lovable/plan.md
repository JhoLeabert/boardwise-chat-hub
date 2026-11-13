# Kanban Interaktif + Login + Chatbot AI

Gaya visual mengikuti referensi: sidebar gelap navy (seperti Vintanzo), area konten putih dengan kartu tugas rapi, label prioritas/kategori berwarna, progress bar, avatar anggota, dan aksen biru-ungu lembut.

## Halaman
1. **Login / Daftar** (`/auth`) - email & password, tampilan split modern dengan ilustrasi. Wajib login untuk mengakses kanban.
2. **Kanban Board** (`/board`, terlindungi):
   - Sidebar: logo, menu, daftar proyek, tag, profil pengguna + tombol keluar.
   - Header proyek: nama, % selesai, tanggal, anggota.
   - 4 kolom: To-Do, In Progress, In Review, Completed (jumlah tugas per kolom).
   - **Drag & drop** kartu antar kolom dan urutan dalam kolom (tersimpan otomatis).
   - Tambah, edit, hapus tugas lewat modal: judul, deskripsi, prioritas (Low/Medium/High), kategori, progress %, tenggat.
   - Pencarian dan filter prioritas.
   - Data contoh otomatis dibuat saat pengguna pertama kali masuk.
3. **Profil** - ubah nama & avatar (unggah foto).
4. Halaman depan `/` mengarahkan ke board (jika sudah login) atau ke login.

## Chatbot AI
- Tombol mengambang di pojok kanan bawah membuka panel chat bergaya glass dengan gradasi, avatar maskot khusus, animasi mengetik, dan saran pertanyaan cepat ("Tugas apa yang prioritas tinggi?", "Ringkas progres proyek").
- Chatbot **membaca isi board** pengguna untuk menjawab.
- Jawaban mengalir (streaming) dengan format markdown.
- Satu percakapan per akun, tersimpan; ada tombol hapus riwayat.

## Detail teknis
- Lovable Cloud: auth email/password, tabel `profiles` (nama, avatar_url, trigger saat daftar), `tasks` (user_id, status, posisi, prioritas, kategori, progress, dll.), `chat_messages`; RLS per pengguna; bucket storage `avatars`.
- Drag & drop pakai `@dnd-kit`.
- Chatbot: server function memanggil Lovable AI Gateway (model default) dengan konteks daftar tugas pengguna; komponen AI Elements untuk UI chat.
- Rute terlindungi di bawah `_authenticated`.
