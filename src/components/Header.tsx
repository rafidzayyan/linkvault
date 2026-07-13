"use client";

import { useLinkVault } from "@/lib/store";
import type { SortKey } from "@/lib/types";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";
import { IconSearch, IconPlus, IconList, IconGrid, IconSun, IconMoon } from "./ui/Icons";

export function Header({
  search,
  onSearch,
  sort,
  onSort,
  onAdd,
  onMenu,
}: {
  search: string;
  onSearch: (v: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  onAdd: () => void;
  onMenu: () => void;
}) {
  const { view, setView } = useLinkVault();
  const { theme, toggle, mounted } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/80 px-3 py-3 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-muted hover:bg-muted-bg lg:hidden" aria-label="Menu">
        <IconList />
      </button>

      <div className="relative flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Cari judul, URL, catatan, atau tag…"
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <select
        value={sort}
        onChange={(e) => onSort(e.target.value as SortKey)}
        className="hidden rounded-lg border border-border bg-card px-2.5 py-2 text-sm outline-none focus:border-primary sm:block"
        aria-label="Urutkan"
      >
        <option value="newest">Terbaru</option>
        <option value="oldest">Terlama</option>
        <option value="az">A–Z</option>
        <option value="most">Paling sering dibuka</option>
      </select>

      <div className="hidden items-center rounded-lg border border-border bg-card p-0.5 sm:flex">
        <button onClick={() => setView("list")} className={cn("rounded-md p-1.5 transition", view === "list" ? "bg-muted-bg text-foreground" : "text-muted")} aria-label="List view">
          <IconList width={16} height={16} />
        </button>
        <button onClick={() => setView("grid")} className={cn("rounded-md p-1.5 transition", view === "grid" ? "bg-muted-bg text-foreground" : "text-muted")} aria-label="Grid view">
          <IconGrid width={16} height={16} />
        </button>
      </div>

      <button
        onClick={toggle}
        className="rounded-lg border border-border bg-card p-2 text-muted transition hover:text-foreground"
        aria-label="Ganti tema"
      >
        {mounted && theme === "dark" ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
      </button>

      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg transition hover:bg-primary-hover"
      >
        <IconPlus width={16} height={16} />
        <span className="hidden sm:inline">Tambah Link</span>
      </button>
    </header>
  );
}
