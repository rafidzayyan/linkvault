"use client";

import { useLinkVault } from "@/lib/store";
import { IconLink, IconPlus, IconSearch } from "./ui/Icons";

export function EmptyState({ mode, onAdd }: { mode: "empty" | "no-results"; onAdd: () => void }) {
  const { canEdit } = useLinkVault();

  if (mode === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted-bg text-muted">
          <IconSearch width={26} height={26} />
        </span>
        <h3 className="text-base font-semibold">Tidak ada link yang cocok</h3>
        <p className="mt-1 max-w-sm text-sm text-muted">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <IconLink width={26} height={26} />
      </span>
      <h3 className="text-base font-semibold">Belum ada link tersimpan</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        {canEdit
          ? "Simpan link pertamamu — artikel, video, tools AI, atau referensi apa pun — dan atur ke dalam kategori agar mudah ditemukan."
          : "Vault ini masih kosong. Link yang ditambahkan pemilik atau editor akan muncul di sini."}
      </p>
      {canEdit && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:bg-primary-hover"
        >
          <IconPlus width={16} height={16} /> Tambah Link Pertama
        </button>
      )}
    </div>
  );
}
