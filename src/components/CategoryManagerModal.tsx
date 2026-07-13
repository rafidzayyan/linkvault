"use client";

import { useMemo, useState } from "react";
import { Modal } from "./ui/Modal";
import { useLinkVault } from "@/lib/store";
import { CATEGORY_COLORS } from "./categoryPresets";
import { IconEdit, IconTrash, IconCheck, IconX, IconPlus } from "./ui/Icons";
import type { Category } from "@/lib/types";

export function CategoryManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categories, links, addCategory, renameCategory, deleteCategory, reorderCategories } = useLinkVault();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [newIcon, setNewIcon] = useState("");
  const [addError, setAddError] = useState("");

  const [deleting, setDeleting] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    links.forEach((l) => (m[l.categoryId] = (m[l.categoryId] ?? 0) + 1));
    return m;
  }, [links]);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
    setEditIcon(c.icon ?? "");
  }

  function saveEdit() {
    if (editingId) {
      const ok = renameCategory(editingId, editName, editColor, editIcon);
      if (!ok) return;
    }
    setEditingId(null);
  }

  function handleAdd() {
    setAddError("");
    const created = addCategory(newName, newColor, newIcon);
    if (!created) {
      setAddError("Nama kosong atau sudah ada.");
      return;
    }
    setNewName("");
    setNewIcon("");
    setNewColor(CATEGORY_COLORS[0]);
  }

  function move(index: number, dir: -1 | 1) {
    const ids = categories.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorderCategories(ids);
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteCategory(deleting.id, reassignTo || categories.find((c) => c.isDefault)?.id || "");
    setDeleting(null);
    setReassignTo("");
  }

  const inputCls =
    "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Modal open={open} onClose={onClose} title="Kelola Kategori" maxWidth="max-w-xl">
      {/* Existing categories */}
      <ul className="space-y-2">
        {categories.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            {/* reorder */}
            <div className="flex flex-col text-muted">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="leading-none disabled:opacity-30" aria-label="Naik">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === categories.length - 1} className="leading-none disabled:opacity-30" aria-label="Turun">▼</button>
            </div>

            {editingId === c.id ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} placeholder="🙂" className={`${inputCls} w-14 text-center`} maxLength={2} />
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputCls} flex-1`} />
                <div className="flex gap-1">
                  {CATEGORY_COLORS.map((col) => (
                    <button key={col} type="button" onClick={() => setEditColor(col)} className={`h-5 w-5 rounded-full ${editColor === col ? "ring-2 ring-offset-1 ring-offset-background" : ""}`} style={{ backgroundColor: col }} aria-label={col} />
                  ))}
                </div>
                <button onClick={saveEdit} className="rounded-md p-1.5 text-primary hover:bg-muted-bg" aria-label="Simpan"><IconCheck width={16} height={16} /></button>
                <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-muted hover:bg-muted-bg" aria-label="Batal"><IconX width={16} height={16} /></button>
              </div>
            ) : (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                  {c.icon || "•"}
                </span>
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted">{counts[c.id] ?? 0} link</span>
                {c.isDefault && <span className="rounded-full bg-muted-bg px-2 py-0.5 text-[10px] text-muted">default</span>}
                <button onClick={() => startEdit(c)} className="rounded-md p-1.5 text-muted hover:bg-muted-bg hover:text-foreground" aria-label="Edit"><IconEdit width={16} height={16} /></button>
                <button
                  onClick={() => {
                    setDeleting(c);
                    setReassignTo(categories.find((x) => x.isDefault && x.id !== c.id)?.id ?? "");
                  }}
                  disabled={c.isDefault}
                  className="rounded-md p-1.5 text-muted hover:bg-muted-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Hapus"
                  title={c.isDefault ? "Kategori default tidak bisa dihapus" : "Hapus"}
                >
                  <IconTrash width={16} height={16} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Add new */}
      <div className="mt-4 rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted">Tambah kategori baru</p>
        <div className="flex flex-wrap items-center gap-2">
          <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="🙂" className={`${inputCls} w-14 text-center`} maxLength={2} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama kategori" className={`${inputCls} flex-1`} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <div className="flex gap-1">
            {CATEGORY_COLORS.map((col) => (
              <button key={col} type="button" onClick={() => setNewColor(col)} className={`h-5 w-5 rounded-full ${newColor === col ? "ring-2 ring-offset-1 ring-offset-card" : ""}`} style={{ backgroundColor: col }} aria-label={col} />
            ))}
          </div>
          <button onClick={handleAdd} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg transition hover:bg-primary-hover">
            <IconPlus width={16} height={16} /> Tambah
          </button>
        </div>
        {addError && <p className="mt-1 text-xs text-danger">{addError}</p>}
      </div>

      {/* Delete + reassignment sub-flow (Business Rule #4) */}
      {deleting && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/5 p-3">
          <p className="text-sm">
            Hapus kategori <strong>{deleting.name}</strong>?
            {(counts[deleting.id] ?? 0) > 0 && (
              <> {counts[deleting.id]} link di dalamnya akan dipindahkan ke:</>
            )}
          </p>
          {(counts[deleting.id] ?? 0) > 0 && (
            <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={`${inputCls} mt-2 w-full`}>
              {categories.filter((c) => c.id !== deleting.id).map((c) => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
              ))}
            </select>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setDeleting(null)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted-bg">Batal</button>
            <button onClick={confirmDelete} className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Hapus</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
