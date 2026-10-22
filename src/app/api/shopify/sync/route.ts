import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { fetchAllPieces } from "@/lib/shopify/admin";
import { createAdminClient } from "@/lib/supabase/server";

const RENTAL_ONLY = /rental\s*only/i;

/**
 * Mirror Shopify products into `pieces`. Leaves rental fields (is_rentable, daily_rate_cents) untouched,
 * except titles marked "rental only", which are always rentable.
 */
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

  const rentalOnly = pieces.filter((p) => RENTAL_ONLY.test(p.title)).map((p) => p.productId);
  if (rentalOnly.length) {
    const { error: flagError } = await createAdminClient()
      .from("pieces")
      .update({ is_rentable: true })
      .in("shopify_product_id", rentalOnly);
    if (flagError) return NextResponse.json({ error: flagError.message }, { status: 500 });
  }
  return NextResponse.json({ synced: pieces.length, rentalOnly: rentalOnly.length });
}
