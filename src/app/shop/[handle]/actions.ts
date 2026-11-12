"use server";

import { z } from "zod";
import { formatMoney } from "@/lib/catalog-format";
import { rentalRequested, staffRentalRequest } from "@/lib/email/templates";
import { notify, notifyStaff } from "@/lib/notify";
import { rentalEmailData } from "@/lib/rentals";
import { todayInShowroom } from "@/lib/dates";
import { daysBetween, quoteRental, type Quote, type RelationshipTier } from "@/lib/pricing";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  startsOn: z.iso.date("Pick a pick-up date"),
  dueOn: z.iso.date("Pick a return date"),
  occasion: z.string().trim().max(1000).optional(),
  budget: z.string().trim().optional(),
});

export type RentalRequest = z.input<typeof RequestSchema>;

/** Engine price for staff to start from. Null when the piece has no usable retail price or daily rate yet. */
function suggestedQuote(
  piece: { retail_price_cents: number; daily_rate_cents: number | null },
  tier: RelationshipTier,
  startsOn: string,
  dueOn: string,
): Quote | null {
  try {
    return quoteRental({
      retailPriceCents: piece.retail_price_cents,
      dailyRateOverrideCents: piece.daily_rate_cents,
      startsOn,
      dueOn,
      tier,
      bookedOn: todayInShowroom(),
    });
  } catch {
    return null;
  }
}

/**
 * Send a rental request. No price yet: staff review the dates, occasion, budget and relationship,
 * work out a rate with the member, then set it in the admin for them to pay.
 */
export async function requestRental(shopifyProductId: string, input: RentalRequest): Promise<{ ok?: true; error?: string }> {
  const parsed = RequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const f = parsed.data;
  if (daysBetween(f.startsOn, f.dueOn) < 0) return { error: "Return date must be on or after pick-up" };
  if (daysBetween(todayInShowroom(), f.startsOn) < 0) return { error: "Pick-up date is in the past" };
  const budgetDollars = f.budget ? Number(f.budget.replace(/[$,\s]/g, "")) : null;
  if (budgetDollars !== null && (!Number.isFinite(budgetDollars) || budgetDollars < 0)) return { error: "Budget must be a dollar amount" };
  const budgetCents = budgetDollars === null ? null : Math.round(budgetDollars * 100);

  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sign in to rent." };
  const { data: profile } = await supabase.from("profiles").select("id, full_name, email, phone, sms_opt_in, tier, address_line1").eq("id", auth.user.id).single();
  if (!profile) return { error: "Sign in to rent." };
  if (!profile.address_line1) return { error: "Add your address on your account page before renting." };

  const db = createAdminClient();
  const { data: piece } = await db
    .from("pieces")
    .select("id, title, vendor, image_url, retail_price_cents, daily_rate_cents, is_rentable")
    .eq("shopify_product_id", shopifyProductId)
    .single();
  if (!piece?.is_rentable) return { error: "This piece isn't available to rent." };

  const suggestion = suggestedQuote(piece, profile.tier as RelationshipTier, f.startsOn, f.dueOn);
  const { data: rental, error: insertError } = await db.from("rentals").insert({
    profile_id: profile.id,
    piece_id: piece.id,
    starts_on: f.startsOn,
    due_on: f.dueOn,
    occasion: f.occasion || null,
    budget_cents: budgetCents,
    quote_breakdown: suggestion,
  })
    .select("id, starts_on, due_on")
    .single();
  if (insertError || !rental) return { error: insertError?.message ?? "Couldn't save your request" };
  const emailData = rentalEmailData({ ...rental, pieces: piece });
  await notify({ email: profile.email, phone: profile.phone, smsOptIn: profile.sms_opt_in }, rentalRequested(emailData));
  await notifyStaff(
    staffRentalRequest(emailData, {
      name: profile.full_name,
      tier: profile.tier,
      occasion: f.occasion,
      budgetCents,
      suggestedCents: suggestion?.totalCents ?? null,
    }),
  );
  return { ok: true };
}
