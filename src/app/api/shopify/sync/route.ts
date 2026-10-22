import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { fetchAllPieces } from "@/lib/shopify/admin";
import { createAdminClient } from "@/lib/supabase/server";

/** Mirror Shopify products into `pieces`. Leaves rental fields (is_rentable, daily_rate_cents) untouched. */
export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pieces = await fetchAllPieces();
  const { error } = await createAdminClient()
    .from("pieces")
    .upsert(
      pieces.map((p) => ({
        shopify_product_id: p.productId,
        shopify_variant_id: p.variantId,
        shopify_inventory_item_id: p.inventoryItemId,
        title: p.title,
        vendor: p.vendor,
        image_url: p.imageUrl,
        retail_price_cents: p.priceCents,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "shopify_product_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ synced: pieces.length });
}
