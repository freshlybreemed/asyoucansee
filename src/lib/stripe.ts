import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  client ??= new Stripe(env("STRIPE_SECRET_KEY"));
  return client;
}

/** Get or create the Stripe customer for a member. */
export async function ensureCustomer(profile: { id: string; email: string; full_name: string; stripe_customer_id: string | null }) {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const customer = await stripe().customers.create({
    email: profile.email,
    name: profile.full_name,
    metadata: { profile_id: profile.id },
  });
  return customer.id;
}

/** SetupIntent so the member saves a card we can charge later for rentals and late fees. */
export async function createCardSetup(customerId: string) {
  return stripe().setupIntents.create({ customer: customerId, usage: "off_session", payment_method_types: ["card"] });
}

/** Charge the member's default saved card without them present (late fees, rental total). */
export async function chargeSavedCard(customerId: string, amountCents: number, description: string, idempotencyKey: string) {
  const methods = await stripe().paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
  const pm = methods.data[0];
  if (!pm) throw new Error(`No card on file for ${customerId}`);
  return stripe().paymentIntents.create(
    {
      customer: customerId,
      payment_method: pm.id,
      amount: amountCents,
      currency: "usd",
      off_session: true,
      confirm: true,
      description,
    },
    { idempotencyKey },
  );
}
