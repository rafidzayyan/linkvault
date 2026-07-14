// Core data models for LinkVault (PRD Section 4.2)

// Sharing (ala Google Sheets): sebuah vault dimiliki satu owner dan bisa
// di-share ke email lain sebagai viewer atau editor.
export type Role = "viewer" | "editor";
export type AccessLevel = "owner" | "editor" | "viewer";

export interface Vault {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  // Tingkat akses user saat ini terhadap vault ini (dihitung di klien).
  access: AccessLevel;
}

export interface VaultMember {
  id: string;
  vaultId: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: string;
  vaultId: string;
  name: string;
  color: string; // hex color for visual scanning
  icon?: string; // emoji icon (optional)
  order: number; // display order
  isDefault: boolean; // true for "Others" — cannot be deleted
  createdAt: string; // ISO timestamp
}

export interface LinkItem {
  id: string;
  vaultId: string;
  url: string;
  title: string;
  description?: string;
  categoryId: string;
  tags: string[];
  favicon?: string;
  isFavorite: boolean;
  isRead: boolean;
  clickCount: number;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SortKey = "newest" | "oldest" | "az" | "most";
export type ViewMode = "list" | "grid";

// Special sidebar filters (not real categories)
export const FILTER_ALL = "__all__";
export const FILTER_FAVORITES = "__favorites__";

export interface LinkFormValues {
  url: string;
  title: string;
  description?: string;
  categoryId: string;
  tags: string[];
}
