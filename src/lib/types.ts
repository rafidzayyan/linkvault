// Core data models for LinkVault (PRD Section 4.2)

export interface Category {
  id: string;
  name: string;
  color: string; // hex color for visual scanning
  icon?: string; // emoji icon (optional)
  order: number; // display order
  isDefault: boolean; // true for "Others" — cannot be deleted
  createdAt: string; // ISO timestamp
}

export interface LinkItem {
  id: string;
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
