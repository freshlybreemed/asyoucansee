import { NextResponse } from "next/server";
import { todayInShowroom } from "@/lib/dates";
import { env } from "@/lib/env";
import { computeLateFee } from "@/lib/late-fees";
import { notify } from "@/lib/notify";
import { chargeSavedCard } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

/** Daily: mark overdue rentals late, charge $30/day on the card on file, and notify the member. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const today = todayInShowroom();

  const { data: overdue, error } = await db
    .from("rentals")
    .select("id, due_on, late_fee_cents, late_fee_charged_through, pieces(title), profiles(email, phone, sms_opt_in, stripe_customer_id)")
    .in("status", ["checked_out", "late"])
    .lt("due_on", today);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const r of overdue ?? []) {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const piece = Array.isArray(r.pieces) ? r.pieces[0] : r.pieces;
    const fee = computeLateFee({ dueOn: r.due_on, today, chargedThrough: r.late_fee_charged_through });
    if (!profile || fee.newFeeCents === 0) continue;

    let chargeError: string | null = null;
    try {
      if (!profile.stripe_customer_id) throw new Error("No Stripe customer");
      await chargeSavedCard(
        profile.stripe_customer_id,
        fee.newFeeCents,
        `Late fee: ${piece?.title} (${fee.newDays} day${fee.newDays === 1 ? "" : "s"})`,
        `late-fee-${r.id}-${fee.chargeThrough}`,
      );
    } catch (e) {
      chargeError = String(e);
    }

    // Record the fee either way so the balance is visible; a failed charge is flagged for follow-up.
    await db
      .from("rentals")
      .update({
        status: "late",
        late_fee_cents: r.late_fee_cents + fee.newFeeCents,
        late_fee_charged_through: fee.chargeThrough,
        notes: chargeError ? `Late fee charge failed ${today}: ${chargeError}` : undefined,
      })
      .eq("id", r.id);

    const notifyErrors = await notify(
      { email: profile.email, phone: profile.phone, smsOptIn: profile.sms_opt_in },
      "As You Can See: rental overdue",
      `${piece?.title} was due ${r.due_on}. It's ${fee.daysLate} day(s) late; $30/day is charged to your card on file until it's returned.`,
    );
    results.push({ rentalId: r.id, charged: fee.newFeeCents, chargeError, notifyErrors });
  }
  return NextResponse.json({ today, processed: results.length, results });
}
