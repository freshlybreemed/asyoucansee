"use server";

import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { createCardSetup, ensureCustomer } from "@/lib/stripe";

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
