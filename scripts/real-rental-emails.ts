/**
 * QA the email flow on a real rental: files a rental request for a real member on a real piece, exactly as the
 * shop's request form does (member "request received" email + staff alert). Staff then take it from there in
 * /admin (set a rate, confirm, check out, check in) and production sends each step's email.
 *
 * Usage: set -a; source .env.local; set +a; SITE_URL=https://asyoucansee.vercel.app \
 *   npx tsx scripts/real-rental-emails.ts <member email>
 */
import { createClient } from "@supabase/supabase-js";
import { addDays, todayInShowroom } from "@/lib/dates";
import { rentalRef, rentalRequested, rentalUrl, staffRentalRequest } from "@/lib/email/templates";
import { notify, notifyStaff, siteUrl } from "@/lib/notify";

const memberEmail = process.argv[2];
if (!memberEmail) throw new Error("Usage: real-rental-emails.ts <member email>");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: member, error: mErr } = await db
    .from("profiles")
    .select("id, full_name, email, phone, sms_opt_in, tier")
    .eq("email", memberEmail)
    .single();
  if (mErr || !member) throw new Error(`No member ${memberEmail}`);
  const { data: piece, error: pErr } = await db
    .from("pieces")
    .select("id, title, vendor, image_url")
    .eq("is_rentable", true)
    .not("image_url", "is", null)
    .limit(1)
    .single();
  if (pErr || !piece) throw new Error("No rentable piece");

  const startsOn = addDays(todayInShowroom(), 7);
  const dueOn = addDays(startsOn, 3);
  const occasion = "Email QA test rental";
  const { data: rental, error } = await db
    .from("rentals")
    .insert({ profile_id: member.id, piece_id: piece.id, starts_on: startsOn, due_on: dueOn, occasion, budget_cents: 100 })
    .select("id")
    .single();
  if (error || !rental) throw new Error(error?.message ?? "insert failed");

  const r = { id: rental.id, startsOn, dueOn, piece: { title: piece.title, vendor: piece.vendor, imageUrl: piece.image_url } };
  const errors = await notify({ email: member.email, phone: member.phone, smsOptIn: member.sms_opt_in }, rentalRequested(r));
  await notifyStaff(staffRentalRequest(r, { name: member.full_name, tier: member.tier, occasion, budgetCents: 100, suggestedCents: null }));

  console.log(`${rentalRef(rental.id)} requested by ${member.full_name}: ${piece.vendor} ${piece.title}, ${startsOn} to ${dueOn}`);
  console.log(errors.length ? `member email FAILED: ${JSON.stringify(errors)}` : `member email sent to ${member.email}`);
  console.log(`staff alert sent to ${process.env.ADMIN_NOTIFY_EMAILS}`);
  console.log(`admin: ${siteUrl(`/admin#rental-${rental.id}`)}\norder page: ${rentalUrl(rental.id)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
