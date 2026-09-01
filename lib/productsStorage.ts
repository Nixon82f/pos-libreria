import type { Producto } from "@/types/database";

const PRODUCTS_STORAGE_KEY = "pos_cached_products";

export function getLocalCachedProducts(): Producto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedProducts(productos: Producto[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(productos));
  } catch {
    // ignore
  }
}
