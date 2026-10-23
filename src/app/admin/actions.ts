"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, stripeEnabled } from "@/lib/admin";
import { todayInShowroom } from "@/lib/dates";
import { computeLateFee } from "@/lib/late-fees";
import { notify } from "@/lib/notify";
import type { RelationshipTier } from "@/lib/pricing";
import { nextStatus, type RentalAction, type RentalStatus } from "@/lib/rental-status";
import { adjustAvailable } from "@/lib/shopify/admin";
import { chargeSavedCard } from "@/lib/stripe";

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const RENTAL_SELECT =
  "id, status, starts_on, due_on, quoted_cents, paid_cents, late_fee_cents, late_fee_charged_through, " +
  "pieces(title, vendor, shopify_inventory_item_id), profiles(full_name, email, phone, sms_opt_in, stripe_customer_id, has_card_on_file)";

type RentalRow = {
  id: string;
  status: RentalStatus;
  starts_on: string;
  due_on: string;
  quoted_cents: number;
  paid_cents: number;
  late_fee_cents: number;
  late_fee_charged_through: string | null;
  pieces: { title: string; vendor: string | null; shopify_inventory_item_id: string } | null;
  profiles: { full_name: string; email: string; phone: string | null; sms_opt_in: boolean; stripe_customer_id: string | null; has_card_on_file: boolean } | null;
};

/** Move a rental through its lifecycle, syncing Shopify inventory and notifying the member. */
export async function rentalAction(rentalId: string, action: RentalAction) {
  const { db } = await requireAdmin();
  try {
    const { data, error } = await db.from("rentals").select(RENTAL_SELECT).eq("id", rentalId).single();
    if (error || !data) throw new Error(error?.message ?? "Rental not found");
    const r = data as unknown as RentalRow;
    const status = nextStatus(r.status, action);
    const piece = r.pieces;
    const member = r.profiles;
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    let message: [string, string] | null = null;

    if (action === "confirm") {
      if (stripeEnabled() && member?.stripe_customer_id && member.has_card_on_file && r.quoted_cents > r.paid_cents) {
        await chargeSavedCard(member.stripe_customer_id, r.quoted_cents - r.paid_cents, `Rental: ${piece?.title}`, `rental-${r.id}`);
        Object.assign(update, { paid_cents: r.quoted_cents, paid_at: new Date().toISOString(), payment_method: "stripe" });
      }
      // Hold the piece off Shopify from confirmation so nobody buys it before pickup.
      if (piece) await adjustAvailable(piece.shopify_inventory_item_id, -1, "rental_hold");
      message = ["Rental confirmed", `${piece?.title} is yours ${r.starts_on} to ${r.due_on}. See you at the showroom.`];
    }
    if (action === "decline") {
      message = ["Rental request update", `${piece?.title} isn't available for ${r.starts_on} to ${r.due_on}. Reply and we'll find you something.`];
    }
    if (action === "cancel") {
      if (piece) await adjustAvailable(piece.shopify_inventory_item_id, 1, "rental_return");
      message = ["Rental cancelled", `Your booking for ${piece?.title} (${r.starts_on} to ${r.due_on}) is cancelled.`];
    }
    if (action === "check_out") {
      update.checked_out_at = new Date().toISOString();
      message = ["Enjoy the piece", `${piece?.title} is due back ${r.due_on}. Late returns are $30/day.`];
    }
    if (action === "check_in") {
      const fee = computeLateFee({ dueOn: r.due_on, today: todayInShowroom(), chargedThrough: r.late_fee_charged_through });
      if (fee.newFeeCents > 0) {
        update.late_fee_cents = r.late_fee_cents + fee.newFeeCents;
        update.late_fee_charged_through = fee.chargeThrough;
      }
      if (piece) await adjustAvailable(piece.shopify_inventory_item_id, 1, "rental_return");
      update.returned_at = new Date().toISOString();
      message = ["Returned. Thank you", `We've got ${piece?.title} back. Come see what's new.`];
    }

    const { error: updateError } = await db.from("rentals").update(update).eq("id", r.id);
    if (updateError) {
      throw new Error(updateError.message.includes("rentals_no_overlap") ? "Those dates overlap another booking for this piece." : updateError.message);
    }
    if (member && message) await notify({ email: member.email, phone: member.phone, smsOptIn: member.sms_opt_in }, ...message);
  } catch (e) {
    fail("/admin", e);
  }
  revalidatePath("/admin");
}

/** Record a payment collected in the showroom (cash, card reader, comp). Settles rental and late fees. */
export async function markPaid(rentalId: string, method: "in_person" | "comp") {
  const { db } = await requireAdmin();
  const { data: r, error } = await db.from("rentals").select("quoted_cents, late_fee_cents").eq("id", rentalId).single();
  if (error || !r) fail("/admin", error?.message ?? "Rental not found");
  const { error: updateError } = await db
    .from("rentals")
    .update({
      paid_cents: r.quoted_cents,
      late_fees_paid_cents: r.late_fee_cents,
      paid_at: new Date().toISOString(),
      payment_method: method,
    })
    .eq("id", rentalId);
  if (updateError) fail("/admin", updateError.message);
  revalidatePath("/admin");
}

export async function setRentable(pieceId: string, rentable: boolean) {
  const { db } = await requireAdmin();
  const { error } = await db.from("pieces").update({ is_rentable: rentable }).eq("id", pieceId);
  if (error) fail("/admin/pieces", error.message);
  revalidatePath("/admin/pieces");
  revalidatePath("/rent");
}

export async function setDailyRate(pieceId: string, form: FormData) {
  const { db } = await requireAdmin();
  const raw = String(form.get("dailyRate") ?? "").trim();
  const dollars = raw === "" ? null : Number(raw);
  if (dollars !== null && (!Number.isFinite(dollars) || dollars < 0)) fail("/admin/pieces", "Daily rate must be a dollar amount");
  const { error } = await db
    .from("pieces")
    .update({ daily_rate_cents: dollars === null ? null : Math.round(dollars * 100) })
    .eq("id", pieceId);
  if (error) fail("/admin/pieces", error.message);
  revalidatePath("/admin/pieces");
}

const TIERS: RelationshipTier[] = ["public", "member", "friend", "family", "comp"];

export async function setTier(profileId: string, form: FormData) {
  const { db } = await requireAdmin();
  const tier = String(form.get("tier")) as RelationshipTier;
  if (!TIERS.includes(tier)) fail("/admin/members", "Unknown tier");
  const { error } = await db.from("profiles").update({ tier }).eq("id", profileId);
  if (error) fail("/admin/members", error.message);
  revalidatePath("/admin/members");
}

const CONSIGNMENT_STATUSES = ["new", "reviewing", "accepted", "declined", "received", "listed", "paid_out"] as const;

export async function setConsignmentStatus(id: string, form: FormData) {
  const { db } = await requireAdmin();
  const status = String(form.get("status"));
  if (!(CONSIGNMENT_STATUSES as readonly string[]).includes(status)) fail("/admin/consignments", "Unknown status");
  const { error } = await db
    .from("consignments")
    .update({ status, internal_notes: String(form.get("notes") ?? "") || null })
    .eq("id", id);
  if (error) fail("/admin/consignments", error.message);
  revalidatePath("/admin/consignments");
}
