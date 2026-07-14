# LinkVault — Personal Link Organizer (Cloud + Sharing)

Web app untuk **menyimpan, mengkategorikan, dan melacak link** dari berbagai sumber, kini dengan **login via email (magic link)** dan **sharing antar akun ala Google Sheets**: bagikan vault-mu ke email lain sebagai **Viewer** (lihat isi & history) atau **Editor** (ikut menambah/mengubah), dengan sinkronisasi **realtime**.

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** — Postgres + Auth (Email Magic Link) + Row Level Security + Realtime
- `@supabase/ssr` untuk sesi berbasis cookie (middleware + server client)
- API route `/api/metadata` untuk auto-fetch judul + favicon

## Model sharing

- Setiap user punya **vault pribadi** (dibuat otomatis saat login pertama).
- Owner bisa mengundang email lain sebagai **viewer** atau **editor** (tabel `vault_members`, dicocokkan lewat email di JWT).
- **Row Level Security** menjamin: hanya owner + member yang bisa membaca; hanya owner + editor yang bisa menulis. Lihat `supabase/schema.sql`.
- Status link (favorit/read/klik) bersifat **vault-level** (dipakai bersama) pada versi ini.

---

## Setup (wajib, sekali saja)

### 1. Buat project Supabase
- Daftar di [supabase.com](https://supabase.com) → **New project** (free tier cukup).
- Catat **Project URL** dan **anon public key** dari **Project Settings → API**.

### 2. Jalankan schema database
- Buka **SQL Editor** di dashboard Supabase → **New query**.
- Salin seluruh isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**. (Aman dijalankan ulang.)

### 3. Atur URL Auth (login pakai email — tanpa Google Cloud)
Login memakai **magic link**: user memasukkan email, menerima link masuk, klik → login. Provider **Email** sudah aktif secara default di Supabase, jadi tidak perlu setup OAuth/Google apa pun.

Di Supabase → **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000` (dev) — nanti ganti/tambah domain Vercel untuk produksi.
- **Redirect URLs**: tambahkan `http://localhost:3000/**` dan (saat deploy) `https://*.vercel.app/**`.

> Free tier Supabase membatasi jumlah email/jam. Untuk volume tinggi, hubungkan SMTP sendiri di **Authentication → Emails**.

### 4. Isi environment variable
```bash
cp .env.local.example .env.local
```
Isi `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

> `anon key` memang bersifat publik dan aman dipakai di browser karena semua akses dijaga oleh Row Level Security. **Jangan** pernah menaruh `service_role key` di frontend.

---

## Menjalankan lokal

```bash
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) → masukkan email → klik link masuk yang dikirim ke emailmu.

Jika env belum diisi, app menampilkan layar panduan setup (bukan crash).

## Cara berbagi vault

1. Klik tombol **Bagikan** di header.
2. Masukkan email Gmail tujuan, pilih **Viewer** atau **Editor**, klik **Undang**.
3. Orang tersebut login (masukkan emailnya, klik magic link) → vault muncul di **pemilih vault** (kiri header). Viewer hanya bisa melihat; editor bisa menambah/mengubah.
4. Ubah peran atau cabut akses kapan saja dari dialog **Bagikan** (khusus owner).

## Deploy ke Vercel

1. Push repo ke GitHub, lalu **Import** di [vercel.com](https://vercel.com).
2. Tambahkan Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Setelah dapat domain Vercel, tambahkan domain tsb ke **Supabase → Authentication → URL Configuration** (Site URL + Redirect URLs).
4. Deploy.

## Struktur

```
supabase/schema.sql              # tabel + helper functions + RLS + realtime
src/
├── middleware.ts                # refresh sesi Supabase tiap request
├── app/
│   ├── auth/callback/route.ts   # tukar OAuth code → sesi
│   ├── api/metadata/route.ts    # auto-fetch judul + favicon
│   ├── layout.tsx               # LinkVaultProvider + AuthGate
│   └── page.tsx                 # render <Dashboard/>
├── components/
│   ├── AuthGate.tsx             # login via email (magic link), setup, impor, toast
│   ├── ShareModal.tsx           # dialog berbagi (undang/ubah peran/cabut)
│   ├── VaultSwitcher.tsx        # pindah vault + info user + logout
│   └── ...                      # Header, Sidebar, LinkCard, modal, dsb.
└── lib/
    ├── supabase/{client,server}.ts  # Supabase client (browser & server)
    ├── api.ts                   # akses data Supabase (mapping snake_case↔camelCase)
    ├── store.tsx                # context: sesi, vault, CRUD async, realtime, sharing
    ├── storage.ts               # localStorage: tema/view/vault aktif + migrasi data lama
    ├── types.ts                 # Vault, VaultMember, Category, LinkItem
    └── utils.ts
```

## Migrasi dari versi localStorage lama

Saat login pertama, jika ditemukan data link lama di `localStorage` browser, app menawarkan **impor otomatis** ke vault cloud-mu. Pilih *Impor sekarang* atau *Abaikan*.
