import { PLACEHOLDER_PRICE_CENTS } from "@/lib/catalog-format";
import { getProductsByIds, listProducts, type CatalogProduct } from "@/lib/shopify/catalog";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Homepage hero pieces: anything tagged `featured` in Shopify. Until pieces are tagged,
 * fall back to the highest-priced in-stock pieces (ignoring placeholder rental-only prices).
 */
export async function listFeatured(limit = 9): Promise<{ products: CatalogProduct[]; curated: boolean }> {
  const { products } = await listProducts({ scope: "featured", first: limit });
  if (products.length) return { products, curated: true };

  const { data, error } = await createAdminClient()
    .from("pieces")
    .select("shopify_product_id")
    .lt("retail_price_cents", PLACEHOLDER_PRICE_CENTS)
    .order("retail_price_cents", { ascending: false })
    .limit(limit * 2); // headroom for pieces sold since the last sync
  if (error) throw new Error(error.message);
  const fallback = await getProductsByIds(data.map((p) => p.shopify_product_id));
  return {
    products: fallback.filter((p) => p.status === "ACTIVE" && p.totalInventory > 0 && p.images.length).slice(0, limit),
    curated: false,
  };
}
