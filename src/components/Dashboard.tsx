"use client";

import { useMemo, useState } from "react";
import { useLinkVault } from "@/lib/store";
import { FILTER_ALL, FILTER_FAVORITES, type LinkItem, type SortKey } from "@/lib/types";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { LinkCard } from "./LinkCard";
import { EmptyState } from "./EmptyState";
import { LinkFormModal } from "./LinkFormModal";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { ShareModal } from "./ShareModal";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { ready, categories, links, view, deleteLink } = useLinkVault();

  const [activeFilter, setActiveFilter] = useState<string>(FILTER_ALL);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const visible = useMemo(() => {
    let list = [...links];

    if (activeFilter === FILTER_FAVORITES) list = list.filter((l) => l.isFavorite);
    else if (activeFilter !== FILTER_ALL) list = list.filter((l) => l.categoryId === activeFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          (l.description ?? "").toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    switch (sort) {
      case "oldest":
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "az":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "most":
        list.sort((a, b) => b.clickCount - a.clickCount);
        break;
      default:
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Favorites float to the top (Fase 2: favorit/pin)
    return list.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [links, activeFilter, search, sort]);

  const activeTitle =
    activeFilter === FILTER_ALL
      ? "Semua Link"
      : activeFilter === FILTER_FAVORITES
        ? "Favorit"
        : catMap.get(activeFilter)?.name ?? "Kategori";

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(l: LinkItem) {
    setEditing(l);
    setFormOpen(true);
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted">Memuat LinkVault…</div>
    );
  }

  const hasAnyLinks = links.length > 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <Sidebar active={activeFilter} onSelect={setActiveFilter} onManage={() => setManageOpen(true)} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="lv-overlay absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="lv-modal absolute left-0 top-0 h-full w-72 border-r border-border bg-card">
            <Sidebar
              active={activeFilter}
              onSelect={setActiveFilter}
              onManage={() => {
                setManageOpen(true);
                setDrawerOpen(false);
              }}
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          onAdd={openAdd}
          onShare={() => setShareOpen(true)}
          onMenu={() => setDrawerOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-3 py-5 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-baseline justify-between">
              <h1 className="text-xl font-semibold tracking-tight">{activeTitle}</h1>
              <span className="text-sm text-muted">
                {visible.length} link{search && ` untuk “${search}”`}
              </span>
            </div>

            {!hasAnyLinks ? (
              <EmptyState mode="empty" onAdd={openAdd} />
            ) : visible.length === 0 ? (
              <EmptyState mode="no-results" onAdd={openAdd} />
            ) : (
              <div
                className={cn(
                  view === "grid"
                    ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col gap-2",
                )}
              >
                {visible.map((l) => (
                  <LinkCard
                    key={l.id}
                    link={l}
                    category={catMap.get(l.categoryId)}
                    view={view}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <LinkFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        defaultCategoryId={
          activeFilter !== FILTER_ALL && activeFilter !== FILTER_FAVORITES ? activeFilter : undefined
        }
      />
      <CategoryManagerModal open={manageOpen} onClose={() => setManageOpen(false)} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Link"
        message={
          <>
            Yakin ingin menghapus <strong>{deleteTarget?.title}</strong>? Tindakan ini tidak bisa dibatalkan.
          </>
        }
        onConfirm={() => deleteTarget && deleteLink(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
