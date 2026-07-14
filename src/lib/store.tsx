"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import type {
  AccessLevel,
  Category,
  LinkFormValues,
  LinkItem,
  Role,
  Vault,
  VaultMember,
  ViewMode,
} from "./types";
import {
  clearLegacy,
  loadActiveVault,
  loadLegacyCategories,
  loadLegacyLinks,
  loadView,
  saveActiveVault,
  saveView,
  uid,
} from "./storage";
import * as api from "./api";
import { createClient } from "./supabase/client";
import { faviconFor, normalizeUrl } from "./utils";

type Status = "loading" | "no-config" | "signed-out" | "ready";

interface Ctx {
  status: Status;
  ready: boolean; // data untuk vault aktif sudah termuat
  user: { id: string; email: string; name: string } | null;

  // Vaults & akses
  vaults: Vault[];
  activeVaultId: string | null;
  setActiveVault: (id: string) => void;
  access: AccessLevel;
  canEdit: boolean;

  categories: Category[];
  links: LinkItem[];
  view: ViewMode;
  setView: (v: ViewMode) => void;

  // Auth
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

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

  // Members (sharing)
  members: VaultMember[];
  refreshMembers: () => Promise<void>;
  addMember: (email: string, role: Role) => Promise<string | null>; // returns error message or null
  updateMemberRole: (id: string, role: Role) => Promise<void>;
  removeMember: (id: string) => Promise<void>;

  // Migrasi & error
  legacyCount: number;
  importLegacy: () => Promise<void>;
  dismissLegacy: () => void;
  errorMsg: string | null;
  clearError: () => void;
}

const LinkVaultContext = createContext<Ctx | null>(null);

const isConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function LinkVaultProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => (isConfigured() ? createClient() : null), []);

  const [status, setStatus] = useState<Status>(isConfigured() ? "loading" : "no-config");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Ctx["user"]>(null);

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [members, setMembers] = useState<VaultMember[]>([]);
  const [view, setViewState] = useState<ViewMode>("list");
  const [legacyCount, setLegacyCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reportError = useCallback((e: unknown, fallback = "Terjadi kesalahan.") => {
    const msg = e instanceof Error ? e.message : typeof e === "string" ? e : fallback;
    setErrorMsg(msg);
    // eslint-disable-next-line no-console
    console.error("[LinkVault]", e);
  }, []);
  const clearError = useCallback(() => setErrorMsg(null), []);

  const activeVault = useMemo(
    () => vaults.find((v) => v.id === activeVaultId) ?? null,
    [vaults, activeVaultId],
  );
  const access: AccessLevel = activeVault?.access ?? "viewer";
  const canEdit = access === "owner" || access === "editor";

  useEffect(() => {
    setViewState(loadView());
  }, []);

  // ---- Bootstrap: sesi → vaults → vault aktif -----------------------------

  const bootstrap = useCallback(
    async (u: User) => {
      if (!supabase) return;
      const email = u.email ?? "";
      const name =
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        email.split("@")[0] ||
        "Pengguna";
      setUser({ id: u.id, email, name });

      try {
        let list = await api.fetchAccessibleVaults(supabase, u.id, email);
        // Buat vault pribadi jika user belum punya vault sendiri.
        if (!list.some((v) => v.access === "owner")) {
          await api.createVaultWithDefaults(supabase, u.id, `LinkVault ${name}`);
          list = await api.fetchAccessibleVaults(supabase, u.id, email);
        }
        setVaults(list);

        const saved = loadActiveVault();
        const chosen =
          (saved && list.find((v) => v.id === saved)?.id) ||
          list.find((v) => v.access === "owner")?.id ||
          list[0]?.id ||
          null;
        setActiveVaultId(chosen);
        setStatus("ready");
      } catch (e) {
        reportError(e, "Gagal memuat vault.");
        setStatus("ready");
      }
    },
    [supabase, reportError],
  );

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) bootstrap(data.user);
      else setStatus("signed-out");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setVaults([]);
        setActiveVaultId(null);
        setCategories([]);
        setLinks([]);
        setMembers([]);
        setReady(false);
        setStatus("signed-out");
      } else if (event === "SIGNED_IN") {
        setStatus("loading");
        bootstrap(session.user);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, bootstrap]);

  // ---- Muat data vault aktif ----------------------------------------------

  useEffect(() => {
    if (!supabase || !activeVaultId) return;
    let mounted = true;
    setReady(false);
    saveActiveVault(activeVaultId);

    (async () => {
      try {
        const [cats, lks] = await Promise.all([
          api.fetchCategories(supabase, activeVaultId),
          api.fetchLinks(supabase, activeVaultId),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setLinks(lks);
        setReady(true);

        // Tawarkan impor data lama hanya bila: vault ini milik sendiri & kosong.
        const owns = vaults.find((v) => v.id === activeVaultId)?.access === "owner";
        if (owns && lks.length === 0) {
          setLegacyCount(loadLegacyLinks().length);
        } else {
          setLegacyCount(0);
        }
      } catch (e) {
        if (mounted) {
          reportError(e, "Gagal memuat data vault.");
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, activeVaultId]);

  // ---- Realtime: sinkronkan links & categories vault aktif ----------------

  useEffect(() => {
    if (!supabase || !activeVaultId) return;
    const filter = `vault_id=eq.${activeVaultId}`;

    const channel = supabase
      .channel(`vault:${activeVaultId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "links", filter },
        (payload) => {
          setLinks((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((l) => l.id !== (payload.old as { id: string }).id);
            }
            const row = api.rowToLink(payload.new);
            const exists = prev.some((l) => l.id === row.id);
            if (payload.eventType === "INSERT" && !exists) return [row, ...prev];
            return prev.map((l) => (l.id === row.id ? row : l));
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter },
        (payload) => {
          setCategories((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== (payload.old as { id: string }).id);
            }
            const row = api.rowToCategory(payload.new);
            const exists = prev.some((c) => c.id === row.id);
            if (payload.eventType === "INSERT" && !exists) return [...prev, row];
            return prev.map((c) => (c.id === row.id ? row : c));
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, activeVaultId]);

  // ---- Auth actions --------------------------------------------------------

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) reportError(error, "Gagal masuk dengan Google.");
  }, [supabase, reportError]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const setActiveVault = useCallback((id: string) => setActiveVaultId(id), []);

  // ---- Helpers -------------------------------------------------------------

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    saveView(v);
  }, []);

  const findDuplicate = useCallback(
    (url: string, excludeId?: string) => {
      const norm = normalizeUrl(url).replace(/\/$/, "");
      return links.find((l) => l.id !== excludeId && l.url.replace(/\/$/, "") === norm);
    },
    [links],
  );

  const othersId = useMemo(
    () => categories.find((c) => c.isDefault)?.id ?? categories[0]?.id ?? "",
    [categories],
  );

  // ---- Link mutations (optimistic + tulis DB di background) ---------------

  const addLink = useCallback(
    (values: LinkFormValues): LinkItem => {
      const now = new Date().toISOString();
      const url = normalizeUrl(values.url);
      const item: LinkItem = {
        id: uid(),
        vaultId: activeVaultId ?? "",
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
      if (supabase) {
        api.insertLink(supabase, item).catch((e) => {
          setLinks((prev) => prev.filter((l) => l.id !== item.id));
          reportError(e, "Gagal menyimpan link.");
        });
      }
      return item;
    },
    [supabase, activeVaultId, reportError],
  );

  const updateLink = useCallback(
    (id: string, values: LinkFormValues) => {
      let prevItem: LinkItem | undefined;
      const url = normalizeUrl(values.url);
      const patch: Partial<LinkItem> = {
        url,
        title: values.title.trim() || url,
        description: values.description?.trim() || undefined,
        categoryId: values.categoryId,
        tags: values.tags,
        favicon: faviconFor(url),
        updatedAt: new Date().toISOString(),
      };
      setLinks((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          prevItem = l;
          return { ...l, ...patch };
        }),
      );
      if (supabase) {
        api.patchLink(supabase, id, patch).catch((e) => {
          if (prevItem) setLinks((prev) => prev.map((l) => (l.id === id ? prevItem! : l)));
          reportError(e, "Gagal memperbarui link.");
        });
      }
    },
    [supabase, reportError],
  );

  const deleteLink = useCallback(
    (id: string) => {
      let removed: LinkItem | undefined;
      setLinks((prev) => {
        removed = prev.find((l) => l.id === id);
        return prev.filter((l) => l.id !== id);
      });
      if (supabase) {
        api.deleteLinkRow(supabase, id).catch((e) => {
          if (removed) setLinks((prev) => [removed!, ...prev]);
          reportError(e, "Gagal menghapus link.");
        });
      }
    },
    [supabase, reportError],
  );

  const registerClick = useCallback(
    (id: string) => {
      if (!canEdit) return; // viewer: cukup buka link tanpa mengubah counter
      const now = new Date().toISOString();
      let next = 0;
      setLinks((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          next = l.clickCount + 1;
          return { ...l, clickCount: next, lastOpenedAt: now, isRead: true };
        }),
      );
      if (supabase) {
        api
          .patchLink(supabase, id, { clickCount: next, lastOpenedAt: now, isRead: true })
          .catch((e) => reportError(e, "Gagal mencatat klik."));
      }
    },
    [supabase, canEdit, reportError],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      if (!canEdit) return;
      let value = false;
      setLinks((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          value = !l.isFavorite;
          return { ...l, isFavorite: value };
        }),
      );
      if (supabase) {
        api
          .patchLink(supabase, id, { isFavorite: value })
          .catch((e) => reportError(e, "Gagal mengubah favorit."));
      }
    },
    [supabase, canEdit, reportError],
  );

  const toggleRead = useCallback(
    (id: string) => {
      if (!canEdit) return;
      let value = false;
      setLinks((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          value = !l.isRead;
          return { ...l, isRead: value };
        }),
      );
      if (supabase) {
        api
          .patchLink(supabase, id, { isRead: value })
          .catch((e) => reportError(e, "Gagal mengubah status baca."));
      }
    },
    [supabase, canEdit, reportError],
  );

  // ---- Category mutations --------------------------------------------------

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
      if (!clean || nameExists(clean) || !activeVaultId) return null;
      const cat: Category = {
        id: uid(),
        vaultId: activeVaultId,
        name: clean,
        color,
        icon: icon?.trim() || undefined,
        order: categories.length,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      setCategories((prev) => [...prev, cat]);
      if (supabase) {
        api.insertCategory(supabase, cat).catch((e) => {
          setCategories((prev) => prev.filter((c) => c.id !== cat.id));
          reportError(e, "Gagal menambah kategori.");
        });
      }
      return cat;
    },
    [supabase, activeVaultId, categories.length, nameExists, reportError],
  );

  const renameCategory = useCallback(
    (id: string, name: string, color?: string, icon?: string): boolean => {
      const clean = name.trim();
      if (!clean || nameExists(clean, id)) return false;
      let prev: Category | undefined;
      const patch = {
        name: clean,
        color: color ?? undefined,
        icon: icon !== undefined ? icon || undefined : undefined,
      };
      setCategories((cs) =>
        cs.map((c) => {
          if (c.id !== id) return c;
          prev = c;
          return {
            ...c,
            name: clean,
            color: color ?? c.color,
            icon: icon !== undefined ? icon || undefined : c.icon,
          };
        }),
      );
      if (supabase) {
        api
          .patchCategory(supabase, id, {
            name: patch.name,
            ...(patch.color !== undefined ? { color: patch.color } : {}),
            ...(icon !== undefined ? { icon: icon || null } : {}),
          })
          .catch((e) => {
            if (prev) setCategories((cs) => cs.map((c) => (c.id === id ? prev! : c)));
            reportError(e, "Gagal mengubah kategori.");
          });
      }
      return true;
    },
    [supabase, nameExists, reportError],
  );

  const deleteCategory = useCallback(
    (id: string, reassignTo: string) => {
      const target = reassignTo || othersId;
      const cat = categories.find((c) => c.id === id);
      if (!cat || cat.isDefault || !target) return;
      const prevCats = categories;
      const prevLinks = links;
      setLinks((prev) =>
        prev.map((l) => (l.categoryId === id ? { ...l, categoryId: target } : l)),
      );
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (supabase) {
        api.deleteCategoryAndReassign(supabase, id, target).catch((e) => {
          setCategories(prevCats);
          setLinks(prevLinks);
          reportError(e, "Gagal menghapus kategori.");
        });
      }
    },
    [supabase, categories, links, othersId, reportError],
  );

  const reorderCategories = useCallback(
    (orderedIds: string[]) => {
      let updates: { id: string; order: number }[] = [];
      setCategories((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        const next: Category[] = [];
        orderedIds.forEach((id, i) => {
          const c = map.get(id);
          if (c) next.push({ ...c, order: i });
        });
        prev.forEach((c) => {
          if (!orderedIds.includes(c.id)) next.push({ ...c, order: next.length });
        });
        updates = next.map((c) => ({ id: c.id, order: c.order }));
        return next;
      });
      if (supabase) {
        api.setCategoryOrder(supabase, updates).catch((e) => reportError(e, "Gagal menyusun ulang."));
      }
    },
    [supabase, reportError],
  );

  // ---- Members (sharing) ---------------------------------------------------

  const refreshMembers = useCallback(async () => {
    if (!supabase || !activeVaultId) return;
    try {
      setMembers(await api.fetchMembers(supabase, activeVaultId));
    } catch (e) {
      reportError(e, "Gagal memuat daftar akses.");
    }
  }, [supabase, activeVaultId, reportError]);

  const addMember = useCallback(
    async (email: string, role: Role): Promise<string | null> => {
      if (!supabase || !activeVaultId) return "Vault tidak aktif.";
      const clean = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "Format email tidak valid.";
      if (clean === user?.email?.toLowerCase()) return "Itu email kamu sendiri (owner).";
      if (members.some((m) => m.email.toLowerCase() === clean)) return "Email sudah punya akses.";
      try {
        const m = await api.insertMember(supabase, activeVaultId, clean, role);
        setMembers((prev) => [...prev, m]);
        return null;
      } catch (e) {
        reportError(e, "Gagal menambah akses.");
        return "Gagal menambah akses.";
      }
    },
    [supabase, activeVaultId, user, members, reportError],
  );

  const updateMemberRole = useCallback(
    async (id: string, role: Role) => {
      if (!supabase) return;
      const prev = members;
      setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role } : m)));
      try {
        await api.patchMemberRole(supabase, id, role);
      } catch (e) {
        setMembers(prev);
        reportError(e, "Gagal mengubah peran.");
      }
    },
    [supabase, members, reportError],
  );

  const removeMember = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const prev = members;
      setMembers((ms) => ms.filter((m) => m.id !== id));
      try {
        await api.deleteMember(supabase, id);
      } catch (e) {
        setMembers(prev);
        reportError(e, "Gagal menghapus akses.");
      }
    },
    [supabase, members, reportError],
  );

  // ---- Migrasi data lama ---------------------------------------------------

  const importingRef = useRef(false);
  const importLegacy = useCallback(async () => {
    if (!supabase || !activeVaultId || importingRef.current) return;
    importingRef.current = true;
    try {
      const legacyLinks = loadLegacyLinks();
      const legacyCats = loadLegacyCategories();
      const legacyCatName = new Map(legacyCats.map((c) => [c.id, c.name]));
      const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

      const now = new Date().toISOString();
      const newLinks: LinkItem[] = legacyLinks.map((l) => {
        const oldName = legacyCatName.get(l.categoryId)?.toLowerCase();
        const matched = oldName ? catByName.get(oldName) : undefined;
        const url = normalizeUrl(l.url);
        return {
          id: uid(),
          vaultId: activeVaultId,
          url,
          title: l.title || url,
          description: l.description || undefined,
          categoryId: matched?.id ?? othersId,
          tags: l.tags ?? [],
          favicon: faviconFor(url),
          isFavorite: !!l.isFavorite,
          isRead: !!l.isRead,
          clickCount: l.clickCount ?? 0,
          lastOpenedAt: l.lastOpenedAt ?? null,
          createdAt: l.createdAt ?? now,
          updatedAt: now,
        };
      });

      for (const l of newLinks) await api.insertLink(supabase, l);
      setLinks((prev) => [...newLinks, ...prev]);
      clearLegacy();
      setLegacyCount(0);
    } catch (e) {
      reportError(e, "Gagal mengimpor data lama.");
    } finally {
      importingRef.current = false;
    }
  }, [supabase, activeVaultId, categories, othersId, reportError]);

  const dismissLegacy = useCallback(() => {
    clearLegacy();
    setLegacyCount(0);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      status,
      ready,
      user,
      vaults,
      activeVaultId,
      setActiveVault,
      access,
      canEdit,
      categories: [...categories].sort((a, b) => a.order - b.order),
      links,
      view,
      setView,
      signInWithGoogle,
      signOut,
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
      members,
      refreshMembers,
      addMember,
      updateMemberRole,
      removeMember,
      legacyCount,
      importLegacy,
      dismissLegacy,
      errorMsg,
      clearError,
    }),
    [
      status,
      ready,
      user,
      vaults,
      activeVaultId,
      setActiveVault,
      access,
      canEdit,
      categories,
      links,
      view,
      setView,
      signInWithGoogle,
      signOut,
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
      members,
      refreshMembers,
      addMember,
      updateMemberRole,
      removeMember,
      legacyCount,
      importLegacy,
      dismissLegacy,
      errorMsg,
      clearError,
    ],
  );

  return <LinkVaultContext.Provider value={value}>{children}</LinkVaultContext.Provider>;
}

export function useLinkVault(): Ctx {
  const ctx = useContext(LinkVaultContext);
  if (!ctx) throw new Error("useLinkVault must be used within LinkVaultProvider");
  return ctx;
}
