"use server";

import { stripeEnabled } from "@/lib/admin";
import { notifyStaff } from "@/lib/notify";
import { todayInShowroom } from "@/lib/dates";
import { quoteRental, type Quote, type RelationshipTier } from "@/lib/pricing";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

type QuoteResult = { quote?: Quote; error?: string };

async function loadPieceAndTier(shopifyProductId: string) {
  const db = createAdminClient();
  const { data: piece } = await db
    .from("pieces")
    .select("id, title, retail_price_cents, daily_rate_cents, is_rentable")
    .eq("shopify_product_id", shopifyProductId)
    .single();
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: profile } = auth.user
    ? await supabase.from("profiles").select("id, full_name, tier, has_card_on_file").eq("id", auth.user.id).single()
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
    const message = e instanceof Error ? e.message : String(e);
    // Pieces with placeholder Shopify prices need a hand-set daily rate before they can be quoted.
    if (message.includes("placeholder")) return { error: "This piece is priced on request. Reach out and we'll quote you." };
    return { error: message };
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
  // Card on file is required once Stripe is live; until then payment is collected at pickup.
  if (stripeEnabled() && !profile.has_card_on_file) return { error: "Add a card on your account page before renting." };
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
  await notifyStaff(
    `Rental request: ${piece.title}`,
    `${profile.full_name} (${profile.tier}) wants ${piece.title} from ${startsOn} to ${dueOn}. Quote: $${(quote.totalCents / 100).toFixed(2)}.`,
  );
  return { ok: true };
}
