"use client";

import { useState } from "react";
import { useLinkVault } from "@/lib/store";
import type { Category, LinkItem, ViewMode } from "@/lib/types";
import { hostname, relativeTime, cn } from "@/lib/utils";
import {
  IconStar,
  IconStarFilled,
  IconEdit,
  IconTrash,
  IconCopy,
  IconExternal,
  IconCheck,
  IconLink,
} from "./ui/Icons";

export function LinkCard({
  link,
  category,
  view,
  onEdit,
  onDelete,
}: {
  link: LinkItem;
  category?: Category;
  view: ViewMode;
  onEdit: (l: LinkItem) => void;
  onDelete: (l: LinkItem) => void;
}) {
  const { registerClick, toggleFavorite } = useLinkVault();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  function open() {
    registerClick(link.id);
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const favicon = !imgError && link.favicon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={link.favicon} alt="" className="h-5 w-5 rounded" onError={() => setImgError(true)} />
  ) : (
    <IconLink width={16} height={16} className="text-muted" />
  );

  const catBadge = category && (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${category.color}22`, color: category.color }}
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </span>
  );

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
      {catBadge}
      <span>{hostname(link.url)}</span>
      {link.clickCount > 0 && <span>· {link.clickCount}× dibuka</span>}
      <span>· {relativeTime(link.lastOpenedAt)}</span>
    </div>
  );

  const tags = link.tags.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {link.tags.map((t) => (
        <span key={t} className="rounded bg-muted-bg px-1.5 py-0.5 text-[10px] text-muted">
          #{t}
        </span>
      ))}
    </div>
  );

  const actions = (
    <div className="flex items-center gap-0.5">
      <IconBtn onClick={() => toggleFavorite(link.id)} label="Favorit" active={link.isFavorite}>
        {link.isFavorite ? <IconStarFilled width={16} height={16} className="text-amber-400" /> : <IconStar width={16} height={16} />}
      </IconBtn>
      <IconBtn onClick={copy} label="Salin URL">
        {copied ? <IconCheck width={16} height={16} className="text-emerald-500" /> : <IconCopy width={16} height={16} />}
      </IconBtn>
      <IconBtn onClick={() => onEdit(link)} label="Edit"><IconEdit width={16} height={16} /></IconBtn>
      <IconBtn onClick={() => onDelete(link)} label="Hapus" danger><IconTrash width={16} height={16} /></IconBtn>
    </div>
  );

  if (view === "grid") {
    return (
      <div className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card-hover">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {favicon}
            {!link.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="Belum dibuka" />}
          </div>
          <IconBtn onClick={() => toggleFavorite(link.id)} label="Favorit">
            {link.isFavorite ? <IconStarFilled width={16} height={16} className="text-amber-400" /> : <IconStar width={16} height={16} />}
          </IconBtn>
        </div>
        <button onClick={open} className="text-left">
          <h3 className="line-clamp-2 font-medium leading-snug hover:text-primary">{link.title}</h3>
        </button>
        {link.description && <p className="line-clamp-2 text-xs text-muted">{link.description}</p>}
        {tags}
        <div className="mt-auto space-y-2 pt-1">
          {meta}
          <div className="flex items-center justify-between">
            <button onClick={open} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <IconExternal width={14} height={14} /> Buka
            </button>
            <div className="opacity-0 transition group-hover:opacity-100">
              <div className="flex">
                <IconBtn onClick={copy} label="Salin URL">
                  {copied ? <IconCheck width={16} height={16} className="text-emerald-500" /> : <IconCopy width={16} height={16} />}
                </IconBtn>
                <IconBtn onClick={() => onEdit(link)} label="Edit"><IconEdit width={16} height={16} /></IconBtn>
                <IconBtn onClick={() => onDelete(link)} label="Hapus" danger><IconTrash width={16} height={16} /></IconBtn>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // list view
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-card-hover">
      <div className="flex shrink-0 items-center gap-2">
        {!link.isRead && <span className="h-2 w-2 rounded-full bg-primary" title="Belum dibuka" />}
        {favicon}
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={open} className="block w-full text-left">
          <h3 className={cn("truncate font-medium hover:text-primary", link.isFavorite && "text-foreground")}>{link.title}</h3>
        </button>
        {link.description && <p className="truncate text-xs text-muted">{link.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {meta}
          {tags}
        </div>
      </div>
      <div className="shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">{actions}</div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
  danger,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-1.5 text-muted transition hover:bg-muted-bg",
        danger ? "hover:text-danger" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
