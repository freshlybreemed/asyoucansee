/**
 * Shop categories, grouped from Shopify's product taxonomy. Patterns are Shopify category IDs;
 * a trailing * also matches subcategories (Shopify's category_id search is otherwise exact).
 */
export const CATEGORIES = [
  { key: "tops", label: "Tops", ids: ["aa-1-13*", "archived-174", "aa-1-1-2-*"] },
  { key: "bottoms", label: "Bottoms", ids: ["aa-1-12*", "aa-1-14*", "aa-1-15*", "archived-5584", "archived-5585", "aa-1-1-1-*"] },
  { key: "outerwear", label: "Outerwear", ids: ["aa-1-10*", "aa-1-1-8-*"] },
  { key: "dresses", label: "Dresses & sets", ids: ["aa-1-4", "aa-1-4-*", "aa-1-9*", "archived-162", "aa-1-11*", "aa-1-19*"] },
  { key: "shoes", label: "Shoes", ids: ["aa-8*"] },
  { key: "bags", label: "Bags", ids: ["aa-5*", "lb-*"] },
  { key: "accessories", label: "Accessories", ids: ["aa-2*", "aa-3*", "aa-6*"] },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function isCategoryKey(value: string | undefined): value is CategoryKey {
  return CATEGORIES.some((c) => c.key === value);
}

/** Group for a Shopify category GID or ID (e.g. "gid://shopify/TaxonomyCategory/aa-8-3"), or null if uncategorized. */
export function categoryOf(categoryId: string | null | undefined): CategoryKey | null {
  if (!categoryId) return null;
  const id = categoryId.split("/").pop()!;
  const match = CATEGORIES.find((c) => c.ids.some((p) => (p.endsWith("*") ? id.startsWith(p.slice(0, -1)) : id === p)));
  return match?.key ?? null;
}

/** Shopify product search clause for a category group. */
export function categorySearch(key: CategoryKey): string {
  const group = CATEGORIES.find((c) => c.key === key)!;
  return `(${group.ids.map((id) => `category_id:${id}`).join(" OR ")})`;
}
