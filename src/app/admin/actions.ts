"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { todayInShowroom } from "@/lib/dates";
import { formatMoney } from "@/lib/catalog-format";
import { computeLateFee } from "@/lib/late-fees";
import * as emails from "@/lib/email/templates";
import type { EmailContent } from "@/lib/email/layout";
import { notify } from "@/lib/notify";
import type { RelationshipTier } from "@/lib/pricing";
import { nextStatus, rateSettled, type RentalAction } from "@/lib/rental-status";
import { chargeAndHold, RENTAL_SELECT, rentalEmailData, type RentalRow } from "@/lib/rentals";
import { adjustAvailable } from "@/lib/shopify/admin";

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

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
    const emailData = rentalEmailData(r);
    let message: EmailContent | null = null;

    if (action === "confirm") {
      if (!rateSettled(r)) throw new Error("Waiting on the member to pay. If they paid another way, mark it paid or comp first.");
      Object.assign(update, await chargeAndHold(db, r, { charge: false }));
      message = emails.rentalConfirmed(emailData, r.paid_cents || undefined);
    }
    if (action === "decline") {
      message = emails.rentalDeclined(emailData);
    }
    if (action === "cancel") {
      if (piece) await adjustAvailable(piece.shopify_inventory_item_id, 1, "rental_return");
      message = emails.rentalCancelled(emailData);
    }
    if (action === "check_out") {
      update.checked_out_at = new Date().toISOString();
      message = emails.rentalCheckedOut(emailData);
    }
    if (action === "check_in") {
      const fee = computeLateFee({ dueOn: r.due_on, today: todayInShowroom(), chargedThrough: r.late_fee_charged_through });
      if (fee.newFeeCents > 0) {
        update.late_fee_cents = r.late_fee_cents + fee.newFeeCents;
        update.late_fee_charged_through = fee.chargeThrough;
      }
      if (piece) await adjustAvailable(piece.shopify_inventory_item_id, 1, "rental_return");
      update.returned_at = new Date().toISOString();
      message = emails.rentalReturned(emailData, (update.late_fee_cents as number | undefined) ?? r.late_fee_cents);
    }

    const { error: updateError } = await db.from("rentals").update(update).eq("id", r.id);
    if (updateError) {
      throw new Error(updateError.message.includes("rentals_no_overlap") ? "Those dates overlap another booking for this piece." : updateError.message);
    }
    if (member && message) await notify({ email: member.email, phone: member.phone, smsOptIn: member.sms_opt_in }, message);
  } catch (e) {
    fail("/admin", e);
  }
  revalidatePath("/admin");
}

/** Set (or revise) the price staff agreed with the member, and send it to them to pay. */
export async function setQuote(rentalId: string, form: FormData) {
  const { db } = await requireAdmin();
  const dollars = Number(String(form.get("quote") ?? "").trim());
  if (!Number.isFinite(dollars) || dollars < 0) fail("/admin", "Quote must be a dollar amount");
  const cents = Math.round(dollars * 100);
  const { data, error } = await db
    .from("rentals")
    .update({ quoted_cents: cents, quoted_at: new Date().toISOString(), status: "quoted", updated_at: new Date().toISOString() })
    .eq("id", rentalId)
    .in("status", ["requested", "quoted"])
    .select("id, starts_on, due_on, pieces(title, vendor, image_url), profiles(email, phone, sms_opt_in)")
    .single();
  if (error || !data) fail("/admin", error?.message ?? "Only open requests can be quoted");
  const r = data as unknown as {
    id: string;
    starts_on: string;
    due_on: string;
    pieces: { title: string; vendor: string | null; image_url: string | null } | null;
    profiles: { email: string; phone: string | null; sms_opt_in: boolean } | null;
  };
  if (r.profiles) {
    await notify(
      { email: r.profiles.email, phone: r.profiles.phone, smsOptIn: r.profiles.sms_opt_in },
      emails.rentalQuoted(rentalEmailData(r), cents),
    );
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
      paid_cents: r.quoted_cents ?? 0,
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
