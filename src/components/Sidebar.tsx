"use client";

import { useMemo } from "react";
import { useLinkVault } from "@/lib/store";
import { FILTER_ALL, FILTER_FAVORITES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconSettings, IconStarFilled, IconLink, IconX } from "./ui/Icons";

export function Sidebar({
  active,
  onSelect,
  onManage,
  onClose,
}: {
  active: string;
  onSelect: (id: string) => void;
  onManage: () => void;
  onClose?: () => void;
}) {
  const { categories, links } = useLinkVault();

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    links.forEach((l) => (m[l.categoryId] = (m[l.categoryId] ?? 0) + 1));
    return m;
  }, [links]);

  const favCount = useMemo(() => links.filter((l) => l.isFavorite).length, [links]);

  function Row({
    id,
    label,
    count,
    color,
    icon,
  }: {
    id: string;
    label: string;
    count: number;
    color?: string;
    icon?: React.ReactNode;
  }) {
    const isActive = active === id;
    return (
      <button
        onClick={() => {
          onSelect(id);
          onClose?.();
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
          isActive ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted-bg",
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center">
          {color ? (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          ) : (
            icon
          )}
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        <span className={cn("text-xs", isActive ? "text-primary" : "text-muted")}>{count}</span>
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
            <IconLink width={18} height={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight">LinkVault</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-muted-bg lg:hidden" aria-label="Tutup menu">
            <IconX />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        <Row id={FILTER_ALL} label="Semua Link" count={links.length} icon={<IconLink width={16} height={16} className="text-muted" />} />
        <Row
          id={FILTER_FAVORITES}
          label="Favorit"
          count={favCount}
          icon={<IconStarFilled width={16} height={16} className="text-amber-400" />}
        />

        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Kategori</div>
        {categories.map((c) => (
          <Row key={c.id} id={c.id} label={`${c.icon ? c.icon + " " : ""}${c.name}`} count={counts[c.id] ?? 0} color={c.color} />
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={onManage}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-muted-bg hover:text-foreground"
        >
          <IconSettings width={16} height={16} />
          Kelola Kategori
        </button>
      </div>
    </div>
  );
}
