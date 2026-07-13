// localStorage persistence layer (PRD Section 4.1 — MVP super cepat pakai localStorage)
import type { Category, LinkItem } from "./types";

const KEYS = {
  categories: "linkvault:categories",
  links: "linkvault:links",
  theme: "linkvault:theme",
  view: "linkvault:view",
} as const;

export const OTHERS_ID = "others";

// 5 kategori default sesuai PRD Section 2.2
export function defaultCategories(now: string): Category[] {
  return [
    { id: "ai", name: "AI", color: "#6366f1", icon: "🤖", order: 0, isDefault: false, createdAt: now },
    { id: "digital-marketing", name: "Digital Marketing", color: "#ec4899", icon: "📈", order: 1, isDefault: false, createdAt: now },
    { id: "automation", name: "Automation", color: "#f59e0b", icon: "⚙️", order: 2, isDefault: false, createdAt: now },
    { id: "youtube", name: "YouTube", color: "#ef4444", icon: "▶️", order: 3, isDefault: false, createdAt: now },
    { id: OTHERS_ID, name: "Others", color: "#64748b", icon: "📦", order: 4, isDefault: true, createdAt: now },
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

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return [];
  const stored = safeParse<Category[]>(localStorage.getItem(KEYS.categories));
  if (stored && stored.length > 0) return stored;
  const seeded = defaultCategories(new Date().toISOString());
  localStorage.setItem(KEYS.categories, JSON.stringify(seeded));
  return seeded;
}

export function loadLinks(): LinkItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<LinkItem[]>(localStorage.getItem(KEYS.links)) ?? [];
}

export function saveCategories(categories: Category[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.categories, JSON.stringify(categories));
}

export function saveLinks(links: LinkItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.links, JSON.stringify(links));
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

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
