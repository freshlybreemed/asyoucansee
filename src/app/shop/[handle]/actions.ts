"use server";

import { todayInShowroom } from "@/lib/dates";
import { quoteRental, type Quote, type RelationshipTier } from "@/lib/pricing";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

type QuoteResult = { quote?: Quote; error?: string };

async function loadPieceAndTier(shopifyProductId: string) {
  const db = createAdminClient();
  const { data: piece } = await db
    .from("pieces")
    .select("id, retail_price_cents, daily_rate_cents, is_rentable")
    .eq("shopify_product_id", shopifyProductId)
    .single();
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase.from("profiles").select("id, tier, has_card_on_file").eq("id", auth.user.id).single()
    : { data: null };
  return { piece, profile };
}

function quoteFor(
  piece: { retail_price_cents: number; daily_rate_cents: number | null },
  tier: RelationshipTier,
  startsOn: string,
  dueOn: string,
): QuoteResult {
  try {
    return {
      quote: quoteRental({
        retailPriceCents: piece.retail_price_cents,
        dailyRateOverrideCents: piece.daily_rate_cents,
        startsOn,
        dueOn,
        tier,
        bookedOn: todayInShowroom(),
      }),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getRentalQuote(shopifyProductId: string, startsOn: string, dueOn: string): Promise<QuoteResult> {
  const { piece, profile } = await loadPieceAndTier(shopifyProductId);
  if (!piece?.is_rentable) return { error: "This piece isn't available to rent." };
  return quoteFor(piece, (profile?.tier ?? "public") as RelationshipTier, startsOn, dueOn);
}

export async function requestRental(
  shopifyProductId: string,
  startsOn: string,
  dueOn: string,
): Promise<{ ok?: true; error?: string }> {
  const { piece, profile } = await loadPieceAndTier(shopifyProductId);
  if (!profile) return { error: "Sign in to rent." };
  if (!profile.has_card_on_file) return { error: "Add a card on your account page before renting." };
  if (!piece?.is_rentable) return { error: "This piece isn't available to rent." };

  const { quote, error } = quoteFor(piece, profile.tier as RelationshipTier, startsOn, dueOn);
  if (!quote) return { error };

  const { error: insertError } = await createAdminClient().from("rentals").insert({
    profile_id: profile.id,
    piece_id: piece.id,
    starts_on: startsOn,
    due_on: dueOn,
    quoted_cents: quote.totalCents,
    quote_breakdown: quote,
  });
  if (insertError) return { error: insertError.message };
  return { ok: true };
}
