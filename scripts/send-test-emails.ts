/**
 * Send one of every transactional email (branded HTML) to an inbox, using a real piece from the catalog.
 * Usage: set -a; source .env.local; set +a; npx tsx scripts/send-test-emails.ts you@example.com
 * Set SITE_URL to the live site so the logo and links resolve (defaults to localhost otherwise).
 */
import { createClient } from "@supabase/supabase-js";
import * as t from "@/lib/email/templates";
import { sendEmail } from "@/lib/mailgun";

const to = process.argv[2];
if (!to) throw new Error("Pass a recipient email");

async function samplePiece() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await db.from("pieces").select("title, vendor, image_url").not("image_url", "is", null).eq("is_rentable", true).limit(1).maybeSingle();
  return data ? { title: data.title, vendor: data.vendor, imageUrl: data.image_url } : { title: "Tabi ankle boots", vendor: "Maison Margiela", imageUrl: null };
}

async function main() {
  const piece = await samplePiece();
  const r: t.RentalEmailData = { id: "3f9c2a7e-1b44-4d0a-9e61-7c2b5d8e0a11", startsOn: "2026-11-20", dueOn: "2026-11-23", piece };
  const all = [
    t.rentalRequested(r),
    t.rentalQuoted(r, 12000),
    t.rentalConfirmed(r, 12000),
    t.rentalCheckedOut(r),
    t.rentalReturnReminder(r, "due_tomorrow"),
    t.rentalReturnReminder(r, "due_today"),
    t.rentalOverdue(r, 2, 6000),
    t.rentalOverdue(r, 1, 3000, true),
    t.rentalReturned(r, 6000),
    t.rentalDeclined(r),
    t.rentalCancelled(r),
    t.consignmentReceived({ fullName: "Test Member", designers: "Rick Owens, Margiela" }),
    t.staffRentalRequest(r, { name: "Test Member", tier: "member", occasion: "Gallery opening", budgetCents: 10000, suggestedCents: 12000 }),
    t.staffRentalPaid(r, { name: "Test Member" }, 12000),
    t.staffConsignment({ id: "test", fullName: "Test Member", email: to, socialHandle: "@test", designers: "Rick Owens", items: "Geobaskets, size 43, worn twice.", estimatedValue: "$900", photoCount: 3 }),
  ];
  for (const e of all) {
    try {
      await sendEmail({ to, subject: `[TEST] ${e.subject}`, text: e.text, html: e.html });
      console.log(`sent ${e.subject}`);
    } catch (err) {
      console.log(`FAIL ${e.subject}: ${err}`);
    }
  }
}

main();
