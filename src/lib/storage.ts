// localStorage menyimpan preferensi UI (tema, tampilan, vault aktif) + helper
// kecil. Bila Supabase dikonfigurasi, data link & kategori ada di cloud
// (lihat lib/api.ts). Bila TIDAK dikonfigurasi, app berjalan dalam "mode lokal"
// dan data disimpan penuh di localStorage (kunci linkvault:local:*).
// Kunci "linkvault:categories" / "linkvault:links" lama hanya dibaca untuk
// migrasi/impor sekali.

import type { Category, LinkItem } from "./types";

const KEYS = {
  theme: "linkvault:theme",
  view: "linkvault:view",
  activeVault: "linkvault:activeVault",
  legacyCategories: "linkvault:categories",
  legacyLinks: "linkvault:links",
  localCategories: "linkvault:local:categories",
  localLinks: "linkvault:local:links",
} as const;

export interface CategorySeed {
  name: string;
  color: string;
  icon?: string;
  order: number;
  isDefault: boolean;
}

// 5 kategori default sesuai PRD Section 2.2. "Others" adalah kategori default
// (isDefault) yang tak bisa dihapus dan jadi tujuan pemindahan link.
export function defaultCategorySeeds(): CategorySeed[] {
  return [
    { name: "AI", color: "#6366f1", icon: "🤖", order: 0, isDefault: false },
    { name: "Digital Marketing", color: "#ec4899", icon: "📈", order: 1, isDefault: false },
    { name: "Automation", color: "#f59e0b", icon: "⚙️", order: 2, isDefault: false },
    { name: "YouTube", color: "#ef4444", icon: "▶️", order: 3, isDefault: false },
    { name: "Others", color: "#64748b", icon: "📦", order: 4, isDefault: true },
  ];
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEYS.theme);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(theme: "light" | "dark"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.theme, theme);
}

export function loadView(): "list" | "grid" {
  if (typeof window === "undefined") return "list";
  const stored = localStorage.getItem(KEYS.view);
  return stored === "grid" ? "grid" : "list";
}

export function saveView(view: "list" | "grid"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.view, view);
}

export function loadActiveVault(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.activeVault);
}

export function saveActiveVault(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.activeVault, id);
}

// ---- Mode lokal (tanpa Supabase) ------------------------------------------
// Menyimpan kategori & link penuh di localStorage. Dipakai saat env Supabase
// belum diisi, agar app tetap berfungsi sepenuhnya untuk 1 pengguna/browser.

export function loadLocalCategories(): Category[] {
  if (typeof window === "undefined") return [];
  return safeParse<Category[]>(localStorage.getItem(KEYS.localCategories)) ?? [];
}

export function saveLocalCategories(categories: Category[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.localCategories, JSON.stringify(categories));
}

export function loadLocalLinks(): LinkItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<LinkItem[]>(localStorage.getItem(KEYS.localLinks)) ?? [];
}

export function saveLocalLinks(links: LinkItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.localLinks, JSON.stringify(links));
}

// Bangun kategori default (lengkap dengan id) untuk vault lokal baru.
export function seedLocalCategories(vaultId: string): Category[] {
  const now = new Date().toISOString();
  return defaultCategorySeeds().map((s) => ({
    id: uid(),
    vaultId,
    name: s.name,
    color: s.color,
    icon: s.icon,
    order: s.order,
    isDefault: s.isDefault,
    createdAt: now,
  }));
}

// ---- Migrasi data lama (pra-cloud) ----------------------------------------

interface LegacyCategory {
  id: string;
  name: string;
}
interface LegacyLink {
  url: string;
  title: string;
  description?: string;
  categoryId: string;
  tags?: string[];
  isFavorite?: boolean;
  isRead?: boolean;
  clickCount?: number;
  lastOpenedAt?: string | null;
  createdAt?: string;
}

export function loadLegacyLinks(): LegacyLink[] {
  if (typeof window === "undefined") return [];
  return safeParse<LegacyLink[]>(localStorage.getItem(KEYS.legacyLinks)) ?? [];
}

export function loadLegacyCategories(): LegacyCategory[] {
  if (typeof window === "undefined") return [];
  return safeParse<LegacyCategory[]>(localStorage.getItem(KEYS.legacyCategories)) ?? [];
}

// Dipanggil setelah impor berhasil (atau saat user memilih mulai dari kosong)
// agar prompt impor tidak muncul lagi.
export function clearLegacy(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.legacyLinks);
  localStorage.removeItem(KEYS.legacyCategories);
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
