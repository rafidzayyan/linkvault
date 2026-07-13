"use client";

import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { useLinkVault } from "@/lib/store";
import type { LinkItem } from "@/lib/types";
import { isValidUrl, normalizeUrl } from "@/lib/utils";
import { CATEGORY_COLORS } from "./categoryPresets";

const NEW_CATEGORY = "__new__";

export function LinkFormModal({
  open,
  onClose,
  editing,
  defaultCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  editing?: LinkItem | null;
  defaultCategoryId?: string;
}) {
  const { categories, addLink, updateLink, addCategory, findDuplicate } = useLinkVault();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const othersId = categories.find((c) => c.isDefault)?.id ?? categories[0]?.id ?? "";

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setUrl(editing.url);
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setCategoryId(editing.categoryId);
      setTagsText(editing.tags.join(", "));
    } else {
      setUrl("");
      setTitle("");
      setDescription("");
      setCategoryId(defaultCategoryId && categories.some((c) => c.id === defaultCategoryId) ? defaultCategoryId : othersId);
      setTagsText("");
    }
    setNewCatName("");
    setNewCatColor(CATEGORY_COLORS[0]);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const duplicate = url.trim() && isValidUrl(normalizeUrl(url)) ? findDuplicate(url, editing?.id) : undefined;
  const dupCategory = duplicate ? categories.find((c) => c.id === duplicate.categoryId)?.name : undefined;

  async function handleFetchMetadata() {
    if (!url.trim() || !isValidUrl(normalizeUrl(url))) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(normalizeUrl(url))}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !title.trim()) setTitle(data.title);
      }
    } catch {
      // silent — auto-fetch is best-effort (PRD: Nice to Have)
    } finally {
      setFetching(false);
    }
  }

  function parseTags(): string[] {
    return Array.from(
      new Set(
        tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!url.trim() || !isValidUrl(normalizeUrl(url))) {
      setError("URL tidak valid. Gunakan format http:// atau https://");
      return;
    }

    let finalCategoryId = categoryId;
    if (categoryId === NEW_CATEGORY) {
      const created = addCategory(newCatName, newCatColor);
      if (!created) {
        setError("Nama kategori kosong atau sudah ada.");
        return;
      }
      finalCategoryId = created.id;
    }

    const values = {
      url: normalizeUrl(url),
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: finalCategoryId,
      tags: parseTags(),
    };

    if (editing) updateLink(editing.id, values);
    else addLink(values);
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Link" : "Tambah Link"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">URL</label>
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleFetchMetadata}
            placeholder="https://contoh.com/artikel"
            className={inputCls}
          />
          {fetching && <p className="mt-1 text-xs text-muted">Mengambil judul…</p>}
          {dupCategory && (
            <p className="mt-1 text-xs text-amber-500">
              ⚠ Link sudah tersimpan di kategori &ldquo;{dupCategory}&rdquo;. Kamu tetap bisa menyimpannya.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Judul</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul link (otomatis jika tersedia)"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Kategori</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ Kategori Baru…</option>
          </select>
        </div>

        {categoryId === NEW_CATEGORY && (
          <div className="rounded-lg border border-dashed border-border p-3">
            <label className="mb-1 block text-xs font-medium text-muted">Nama kategori baru</label>
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="mis. Design, Coding…"
              className={inputCls}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  className={`h-6 w-6 rounded-full transition ${newCatColor === color ? "ring-2 ring-offset-2 ring-offset-card" : ""}`}
                  style={{ backgroundColor: color, boxShadow: newCatColor === color ? `0 0 0 2px ${color}` : undefined }}
                  aria-label={color}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Catatan (opsional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Deskripsi singkat…"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Tags (opsional, pisahkan dengan koma)</label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="tutorial, penting, react"
            className={inputCls}
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted-bg"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition hover:bg-primary-hover"
          >
            {editing ? "Simpan Perubahan" : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
