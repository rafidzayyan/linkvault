"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Category, LinkFormValues, LinkItem, SortKey, ViewMode } from "./types";
import {
  OTHERS_ID,
  loadCategories,
  loadLinks,
  loadView,
  saveCategories,
  saveLinks,
  saveView,
  uid,
} from "./storage";
import { faviconFor, normalizeUrl } from "./utils";

interface Ctx {
  ready: boolean;
  categories: Category[];
  links: LinkItem[];
  view: ViewMode;
  setView: (v: ViewMode) => void;

  // Links
  addLink: (values: LinkFormValues) => LinkItem;
  updateLink: (id: string, values: LinkFormValues) => void;
  deleteLink: (id: string) => void;
  registerClick: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleRead: (id: string) => void;
  findDuplicate: (url: string, excludeId?: string) => LinkItem | undefined;

  // Categories
  addCategory: (name: string, color: string, icon?: string) => Category | null;
  renameCategory: (id: string, name: string, color?: string, icon?: string) => boolean;
  deleteCategory: (id: string, reassignTo: string) => void;
  reorderCategories: (orderedIds: string[]) => void;

  // Import / export (Fase 3 groundwork)
  exportData: () => string;
  importData: (json: string) => boolean;
}

const LinkVaultContext = createContext<Ctx | null>(null);

export function LinkVaultProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [view, setViewState] = useState<ViewMode>("list");

  // Hydrate from localStorage on mount
  useEffect(() => {
    setCategories(loadCategories());
    setLinks(loadLinks());
    setViewState(loadView());
    setReady(true);
  }, []);

  // Persist
  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);
  useEffect(() => {
    if (ready) saveLinks(links);
  }, [links, ready]);

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    saveView(v);
  }, []);

  const findDuplicate = useCallback(
    (url: string, excludeId?: string) => {
      const norm = normalizeUrl(url).replace(/\/$/, "");
      return links.find(
        (l) => l.id !== excludeId && l.url.replace(/\/$/, "") === norm,
      );
    },
    [links],
  );

  const addLink = useCallback((values: LinkFormValues): LinkItem => {
    const now = new Date().toISOString();
    const url = normalizeUrl(values.url);
    const item: LinkItem = {
      id: uid(),
      url,
      title: values.title.trim() || url,
      description: values.description?.trim() || undefined,
      categoryId: values.categoryId,
      tags: values.tags,
      favicon: faviconFor(url),
      isFavorite: false,
      isRead: false,
      clickCount: 0,
      lastOpenedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    setLinks((prev) => [item, ...prev]);
    return item;
  }, []);

  const updateLink = useCallback((id: string, values: LinkFormValues) => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const url = normalizeUrl(values.url);
        return {
          ...l,
          url,
          title: values.title.trim() || url,
          description: values.description?.trim() || undefined,
          categoryId: values.categoryId,
          tags: values.tags,
          favicon: faviconFor(url),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const deleteLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const registerClick = useCallback((id: string) => {
    setLinks((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              clickCount: l.clickCount + 1,
              lastOpenedAt: new Date().toISOString(),
              isRead: true,
            }
          : l,
      ),
    );
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isFavorite: !l.isFavorite } : l)),
    );
  }, []);

  const toggleRead = useCallback((id: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isRead: !l.isRead } : l)),
    );
  }, []);

  // Business Rule #5: nama kategori unik (case-insensitive)
  const nameExists = useCallback(
    (name: string, excludeId?: string) =>
      categories.some(
        (c) => c.id !== excludeId && c.name.trim().toLowerCase() === name.trim().toLowerCase(),
      ),
    [categories],
  );

  const addCategory = useCallback(
    (name: string, color: string, icon?: string): Category | null => {
      const clean = name.trim();
      if (!clean || nameExists(clean)) return null;
      const cat: Category = {
        id: uid(),
        name: clean,
        color,
        icon: icon?.trim() || undefined,
        order: categories.length,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, cat]);
      return cat;
    },
    [categories.length, nameExists],
  );

  const renameCategory = useCallback(
    (id: string, name: string, color?: string, icon?: string): boolean => {
      const clean = name.trim();
      if (!clean || nameExists(clean, id)) return false;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: clean, color: color ?? c.color, icon: icon !== undefined ? icon || undefined : c.icon }
            : c,
        ),
      );
      return true;
    },
    [nameExists],
  );

  // Business Rule #3 & #4: "Others" tak bisa dihapus; link dipindah, tidak ikut terhapus
  const deleteCategory = useCallback((id: string, reassignTo: string) => {
    if (id === OTHERS_ID) return;
    const target = reassignTo || OTHERS_ID;
    setLinks((prev) =>
      prev.map((l) => (l.categoryId === id ? { ...l, categoryId: target } : l)),
    );
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reorderCategories = useCallback((orderedIds: string[]) => {
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      const next = orderedIds
        .map((id, i) => {
          const c = map.get(id);
          return c ? { ...c, order: i } : null;
        })
        .filter((c): c is Category => c !== null);
      // include any categories missing from orderedIds at the end
      prev.forEach((c) => {
        if (!orderedIds.includes(c.id)) next.push({ ...c, order: next.length });
      });
      return next;
    });
  }, []);

  const exportData = useCallback(
    () => JSON.stringify({ categories, links, exportedAt: new Date().toISOString() }, null, 2),
    [categories, links],
  );

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.links)) return false;
      setCategories(parsed.categories);
      setLinks(parsed.links);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      categories: [...categories].sort((a, b) => a.order - b.order),
      links,
      view,
      setView,
      addLink,
      updateLink,
      deleteLink,
      registerClick,
      toggleFavorite,
      toggleRead,
      findDuplicate,
      addCategory,
      renameCategory,
      deleteCategory,
      reorderCategories,
      exportData,
      importData,
    }),
    [
      ready,
      categories,
      links,
      view,
      setView,
      addLink,
      updateLink,
      deleteLink,
      registerClick,
      toggleFavorite,
      toggleRead,
      findDuplicate,
      addCategory,
      renameCategory,
      deleteCategory,
      reorderCategories,
      exportData,
      importData,
    ],
  );

  return <LinkVaultContext.Provider value={value}>{children}</LinkVaultContext.Provider>;
}

export function useLinkVault(): Ctx {
  const ctx = useContext(LinkVaultContext);
  if (!ctx) throw new Error("useLinkVault must be used within LinkVaultProvider");
  return ctx;
}
