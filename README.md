# LinkVault — Personal Link Organizer

Web app sederhana untuk **menyimpan, mengkategorikan, dan melacak link** dari berbagai sumber (artikel, video, tools AI, referensi marketing, dll) agar tersusun rapi dan mudah dibuka kembali.

Dibangun sesuai [PRD-LinkVault.md](../PRD-LinkVault.md).

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **localStorage** untuk persistensi data (pendekatan MVP super cepat sesuai PRD §4.1 — tanpa database, langsung deploy & pakai)
- API route `/api/metadata` untuk auto-fetch judul + favicon

## Fitur yang sudah diimplementasikan

**Manajemen Link (CRUD)** — tambah, edit, hapus (dengan konfirmasi), buka di tab baru, salin URL, auto-fetch judul & favicon.

**Kategori dinamis** — 5 kategori default (AI, Digital Marketing, Automation, YouTube, Others), tambah/rename/hapus/reorder, warna & ikon, kategori "Others" terproteksi, reassignment link saat kategori dihapus.

**Pencarian & filter** — search real-time (judul/URL/catatan/tag), filter per kategori, filter favorit, sortir (terbaru/terlama/A–Z/paling sering dibuka).

**Tracking** — click count, last opened, tanggal ditambahkan, status baca (read/unread), favorit/pin.

**UI/UX** — dashboard sidebar + daftar link, toggle list/grid view, responsive (drawer di mobile), dark mode, empty state, counter per kategori.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Deploy ke Vercel (sesuai workflow PRD §9)

1. Push folder ini ke GitHub.
2. Import repo di [vercel.com](https://vercel.com) → framework terdeteksi otomatis (Next.js).
3. Deploy. Tidak perlu environment variable karena data disimpan di `localStorage` browser.

> **Catatan:** karena data disimpan di `localStorage`, data bersifat per-browser/perangkat. Untuk multi-perangkat atau multi-user, lanjutkan ke **Fase 2** (Vercel Postgres/Supabase + Prisma) dan **Fase 3** (auth) sesuai roadmap PRD.

## Struktur

```
src/
├── app/
│   ├── api/metadata/route.ts   # auto-fetch judul + favicon
│   ├── layout.tsx              # provider + theme init
│   ├── page.tsx                # render <Dashboard/>
│   └── globals.css             # tema light/dark
├── components/                 # Header, Sidebar, LinkCard, modal-modal, dsb.
└── lib/
    ├── types.ts                # Category, LinkItem (data model PRD §4.2)
    ├── storage.ts              # localStorage + seed 5 kategori default
    ├── store.tsx               # React context: semua CRUD + business rules
    ├── useTheme.ts
    └── utils.ts                # validasi URL, favicon, format waktu
```
