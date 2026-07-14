// Layer akses data Supabase untuk LinkVault.
// Mapping baris DB (snake_case) <-> model aplikasi (camelCase).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessLevel, Category, LinkItem, Role, Vault, VaultMember } from "./types";
import { defaultCategorySeeds, uid } from "./storage";
import { faviconFor } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type DB = SupabaseClient;

// ---- mappers ---------------------------------------------------------------

function toCategory(r: any): Category {
  return {
    id: r.id,
    vaultId: r.vault_id,
    name: r.name,
    color: r.color,
    icon: r.icon ?? undefined,
    order: r.order,
    isDefault: r.is_default,
    createdAt: r.created_at,
  };
}

function toLink(r: any): LinkItem {
  return {
    id: r.id,
    vaultId: r.vault_id,
    url: r.url,
    title: r.title,
    description: r.description ?? undefined,
    categoryId: r.category_id,
    tags: r.tags ?? [],
    favicon: r.favicon ?? undefined,
    isFavorite: r.is_favorite,
    isRead: r.is_read,
    clickCount: r.click_count,
    lastOpenedAt: r.last_opened_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToLink(r: any): LinkItem {
  return toLink(r);
}
export function rowToCategory(r: any): Category {
  return toCategory(r);
}

function toMember(r: any): VaultMember {
  return {
    id: r.id,
    vaultId: r.vault_id,
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
  };
}

// Ubah patch camelCase → kolom snake_case (hanya key yang dikenal).
function linkPatchToRow(patch: Partial<LinkItem>): Record<string, any> {
  const map: Record<keyof LinkItem, string> = {
    id: "id",
    vaultId: "vault_id",
    url: "url",
    title: "title",
    description: "description",
    categoryId: "category_id",
    tags: "tags",
    favicon: "favicon",
    isFavorite: "is_favorite",
    isRead: "is_read",
    clickCount: "click_count",
    lastOpenedAt: "last_opened_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  };
  const row: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = map[k as keyof LinkItem];
    if (col) row[col] = v ?? null;
  }
  return row;
}

// ---- vaults ----------------------------------------------------------------

export async function fetchAccessibleVaults(
  db: DB,
  userId: string,
  email: string,
): Promise<Vault[]> {
  const { data: vaults, error } = await db
    .from("vaults")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { data: members } = await db
    .from("vault_members")
    .select("vault_id, role")
    .eq("email", email.toLowerCase());
  const roleByVault = new Map<string, Role>(
    (members ?? []).map((m: any) => [m.vault_id, m.role]),
  );

  return (vaults ?? []).map((v: any): Vault => {
    const access: AccessLevel =
      v.owner_id === userId
        ? "owner"
        : roleByVault.get(v.id) === "editor"
          ? "editor"
          : "viewer";
    return {
      id: v.id,
      ownerId: v.owner_id,
      name: v.name,
      createdAt: v.created_at,
      access,
    };
  });
}

export async function createVaultWithDefaults(
  db: DB,
  userId: string,
  name: string,
): Promise<{ vault: Vault; categories: Category[] }> {
  const { data: v, error } = await db
    .from("vaults")
    .insert({ owner_id: userId, name })
    .select()
    .single();
  if (error) throw error;

  const seeds = defaultCategorySeeds().map((s) => ({
    id: uid(),
    vault_id: v.id,
    name: s.name,
    color: s.color,
    icon: s.icon ?? null,
    order: s.order,
    is_default: s.isDefault,
  }));
  const { data: cats, error: e2 } = await db.from("categories").insert(seeds).select();
  if (e2) throw e2;

  return {
    vault: {
      id: v.id,
      ownerId: v.owner_id,
      name: v.name,
      createdAt: v.created_at,
      access: "owner",
    },
    categories: (cats ?? []).map(toCategory).sort((a, b) => a.order - b.order),
  };
}

// ---- categories & links (reads) --------------------------------------------

export async function fetchCategories(db: DB, vaultId: string): Promise<Category[]> {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .eq("vault_id", vaultId)
    .order("order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toCategory);
}

export async function fetchLinks(db: DB, vaultId: string): Promise<LinkItem[]> {
  const { data, error } = await db
    .from("links")
    .select("*")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toLink);
}

// ---- links (writes) --------------------------------------------------------

export async function insertLink(db: DB, l: LinkItem): Promise<void> {
  const { error } = await db.from("links").insert({
    id: l.id,
    vault_id: l.vaultId,
    url: l.url,
    title: l.title,
    description: l.description ?? null,
    category_id: l.categoryId,
    tags: l.tags,
    favicon: l.favicon ?? faviconFor(l.url),
    is_favorite: l.isFavorite,
    is_read: l.isRead,
    click_count: l.clickCount,
    last_opened_at: l.lastOpenedAt,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  });
  if (error) throw error;
}

export async function patchLink(db: DB, id: string, patch: Partial<LinkItem>): Promise<void> {
  const { error } = await db.from("links").update(linkPatchToRow(patch)).eq("id", id);
  if (error) throw error;
}

export async function deleteLinkRow(db: DB, id: string): Promise<void> {
  const { error } = await db.from("links").delete().eq("id", id);
  if (error) throw error;
}

// ---- categories (writes) ---------------------------------------------------

export async function insertCategory(db: DB, c: Category): Promise<void> {
  const { error } = await db.from("categories").insert({
    id: c.id,
    vault_id: c.vaultId,
    name: c.name,
    color: c.color,
    icon: c.icon ?? null,
    order: c.order,
    is_default: c.isDefault,
    created_at: c.createdAt,
  });
  if (error) throw error;
}

export async function patchCategory(
  db: DB,
  id: string,
  patch: { name?: string; color?: string; icon?: string | null; order?: number },
): Promise<void> {
  const { error } = await db.from("categories").update(patch).eq("id", id);
  if (error) throw error;
}

// Pindahkan link ke kategori tujuan lalu hapus kategori.
export async function deleteCategoryAndReassign(
  db: DB,
  id: string,
  targetId: string,
): Promise<void> {
  const { error: e1 } = await db
    .from("links")
    .update({ category_id: targetId })
    .eq("category_id", id);
  if (e1) throw e1;
  const { error: e2 } = await db.from("categories").delete().eq("id", id);
  if (e2) throw e2;
}

export async function setCategoryOrder(
  db: DB,
  updates: { id: string; order: number }[],
): Promise<void> {
  await Promise.all(
    updates.map((u) => db.from("categories").update({ order: u.order }).eq("id", u.id)),
  );
}

// ---- members ---------------------------------------------------------------

export async function fetchMembers(db: DB, vaultId: string): Promise<VaultMember[]> {
  const { data, error } = await db
    .from("vault_members")
    .select("*")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toMember);
}

export async function insertMember(
  db: DB,
  vaultId: string,
  email: string,
  role: Role,
): Promise<VaultMember> {
  const { data, error } = await db
    .from("vault_members")
    .insert({ vault_id: vaultId, email: email.trim().toLowerCase(), role })
    .select()
    .single();
  if (error) throw error;
  return toMember(data);
}

export async function patchMemberRole(db: DB, id: string, role: Role): Promise<void> {
  const { error } = await db.from("vault_members").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function deleteMember(db: DB, id: string): Promise<void> {
  const { error } = await db.from("vault_members").delete().eq("id", id);
  if (error) throw error;
}
