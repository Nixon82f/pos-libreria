/**
 * Helper to persist and retrieve product categories ('libreria' | 'comida')
 * seamlessly across client-side and Supabase.
 */

const STORAGE_KEY = "pos_product_categories_cache";

export function getLocalProductCategories(): Record<string, "libreria" | "comida"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalProductCategory(
  productIdOrName: string,
  categoria: "libreria" | "comida"
) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalProductCategories();
    current[productIdOrName.toLowerCase().trim()] = categoria;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function removeLocalProductCategory(productIdOrName: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalProductCategories();
    delete current[productIdOrName.toLowerCase().trim()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function resolveProductCategory(
  dbCategory?: string | null,
  productId?: string,
  productName?: string
): "libreria" | "comida" {
  if (dbCategory === "comida" || dbCategory === "libreria") {
    return dbCategory;
  }

  const localCache = getLocalProductCategories();
  if (productId && localCache[productId]) {
    return localCache[productId];
  }
  if (productName && localCache[productName.toLowerCase().trim()]) {
    return localCache[productName.toLowerCase().trim()];
  }

  return "libreria";
}

