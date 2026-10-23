import { notFound } from "next/navigation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

/** Gate for /admin pages and actions. Non-admins get a 404 so the dashboard isn't discoverable. */
export async function requireAdmin() {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: profile } = await supabase.from("profiles").select("id, is_admin").eq("id", auth.user.id).single();
  if (!profile?.is_admin) notFound();
  return { adminId: profile.id, db: createAdminClient() };
}

/** Card charges switch on once Stripe keys exist; until then payment is collected in person. */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
