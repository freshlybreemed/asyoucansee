import type { SupabaseClient } from "@supabase/supabase-js";
import { stripeEnabled } from "@/lib/admin";
import type { RentalEmailData } from "@/lib/email/templates";
import type { RentalStatus } from "@/lib/rental-status";
import { adjustAvailable } from "@/lib/shopify/admin";
import { chargeSavedCard } from "@/lib/stripe";

export const RENTAL_SELECT =
  "id, status, piece_id, starts_on, due_on, quoted_cents, paid_cents, late_fee_cents, late_fee_charged_through, " +
  "pieces(title, vendor, image_url, shopify_inventory_item_id), profiles(full_name, email, phone, sms_opt_in, stripe_customer_id, has_card_on_file)";

export type RentalRow = {
  id: string;
  status: RentalStatus;
  piece_id: string;
  starts_on: string;
  due_on: string;
  quoted_cents: number | null;
  paid_cents: number;
  late_fee_cents: number;
  late_fee_charged_through: string | null;
  pieces: { title: string; vendor: string | null; image_url: string | null; shopify_inventory_item_id: string } | null;
  profiles: { full_name: string; email: string; phone: string | null; sms_opt_in: boolean; stripe_customer_id: string | null; has_card_on_file: boolean } | null;
};

/**
 * Charge the saved card for any unpaid quote and hold the piece off Shopify. Returns the rental fields to write.
 * Checks for overlapping bookings first so nobody is charged for dates that can't be honoured.
 * Only the member's own "pay" action charges (charge: true); staff confirmations never touch the card.
 */
export async function chargeAndHold(db: SupabaseClient, r: RentalRow, { charge }: { charge: boolean }): Promise<Record<string, unknown>> {
  if (r.quoted_cents == null) throw new Error("Set a price before confirming");
  const { data: clash } = await db
    .from("rentals")
    .select("id")
    .eq("piece_id", r.piece_id)
    .in("status", ["confirmed", "checked_out", "late"])
    .lte("starts_on", r.due_on)
    .gte("due_on", r.starts_on)
    .neq("id", r.id)
    .limit(1);
  if (clash?.length) throw new Error("Those dates overlap another booking for this piece.");

  const update: Record<string, unknown> = {};
  const member = r.profiles;
  if (charge && stripeEnabled() && member?.stripe_customer_id && member.has_card_on_file && r.quoted_cents > r.paid_cents) {
    await chargeSavedCard(member.stripe_customer_id, r.quoted_cents - r.paid_cents, `Rental: ${r.pieces?.title}`, `rental-${r.id}-${r.quoted_cents}`);
    Object.assign(update, { paid_cents: r.quoted_cents, paid_at: new Date().toISOString(), payment_method: "stripe" });
  }
  // Hold the piece off Shopify from confirmation so nobody buys it before pickup.
  if (r.pieces) await adjustAvailable(r.pieces.shopify_inventory_item_id, -1, "rental_hold");
  return update;
}

/** The slice of a rental row that emails need. */
export function rentalEmailData(r: {
  id: string;
  starts_on: string;
  due_on: string;
  pieces: { title: string; vendor: string | null; image_url: string | null } | null;
}): RentalEmailData {
  return {
    id: r.id,
    startsOn: r.starts_on,
    dueOn: r.due_on,
    piece: r.pieces && { title: r.pieces.title, vendor: r.pieces.vendor, imageUrl: r.pieces.image_url },
  };
}
