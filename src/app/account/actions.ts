"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { stripeEnabled } from "@/lib/admin";
import { rentalConfirmed, staffRentalPaid } from "@/lib/email/templates";
import { notify, notifyStaff } from "@/lib/notify";
import { nextStatus } from "@/lib/rental-status";
import { chargeAndHold, RENTAL_SELECT, rentalEmailData, type RentalRow } from "@/lib/rentals";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { createCardSetup, ensureCustomer } from "@/lib/stripe";

const AddressSchema = z.object({
  addressLine1: z.string().trim().min(1, "Street address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  region: z.string().trim().min(1, "State is required"),
  postalCode: z.string().trim().min(1, "ZIP is required"),
});

export type AddressState = { error?: string; saved?: true };

/** Save the member's address. Collected here rather than at signup to keep signup short. */
export async function saveAddress(_prev: AddressState, form: FormData): Promise<AddressState> {
  const parsed = AddressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid address" };
  const f = parsed.data;

  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("profiles")
    .update({
      address_line1: f.addressLine1,
      address_line2: f.addressLine2 || null,
      city: f.city,
      region: f.region,
      postal_code: f.postalCode,
    })
    .eq("id", auth.user.id);
  if (error) return { error: error.message };
  revalidatePath("/account");
  return { saved: true };
}

/** Start saving a card: returns the SetupIntent client secret for Stripe Elements. */
export async function startCardSetup(): Promise<{ clientSecret: string }> {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id")
    .eq("id", auth.user.id)
    .single();
  if (error || !profile) throw new Error("Profile not found");

  const customerId = await ensureCustomer(profile);
  if (!profile.stripe_customer_id) {
    // Members can't write stripe_customer_id themselves (see protect_profile_fields).
    await createAdminClient().from("profiles").update({ stripe_customer_id: customerId }).eq("id", profile.id);
  }
  const intent = await createCardSetup(customerId);
  return { clientSecret: intent.client_secret! };
}

/** Called after Stripe confirms the SetupIntent client-side. */
export async function markCardSaved() {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  await createAdminClient().from("profiles").update({ has_card_on_file: true }).eq("id", auth.user.id);
}

/** Pay a staff quote with the saved card, which confirms the rental. */
export async function payRental(rentalId: string): Promise<{ ok?: true; error?: string }> {
  const supabase = await createUserClient();
  // RLS only returns the member's own rentals, so this doubles as the ownership check.
  const { data: own } = await supabase.from("rentals").select("id").eq("id", rentalId).maybeSingle();
  if (!own) return { error: "Rental not found" };

  const db = createAdminClient();
  const { data, error } = await db.from("rentals").select(RENTAL_SELECT).eq("id", rentalId).single();
  if (error || !data) return { error: error?.message ?? "Rental not found" };
  const r = data as unknown as RentalRow;
  if (r.status !== "quoted") return { error: "This rental isn't waiting on payment." };
  if (!stripeEnabled()) return { error: "Card payments aren't on yet. Pay at the showroom and we'll confirm it." };
  if (!r.profiles?.has_card_on_file) return { error: "Add a card above first." };

  try {
    const update = await chargeAndHold(db, r);
    const { error: updateError } = await db
      .from("rentals")
      .update({ ...update, status: nextStatus(r.status, "confirm"), updated_at: new Date().toISOString() })
      .eq("id", r.id);
    if (updateError) throw new Error(updateError.message);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }

  const member = r.profiles;
  const emailData = rentalEmailData(r);
  await notify({ email: member.email, phone: member.phone, smsOptIn: member.sms_opt_in }, rentalConfirmed(emailData, r.quoted_cents ?? undefined));
  await notifyStaff(staffRentalPaid(emailData, { name: member.full_name }, r.quoted_cents ?? undefined));
  revalidatePath("/account");
  return { ok: true };
}
