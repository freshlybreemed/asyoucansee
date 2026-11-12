import { NextResponse } from "next/server";
import { addDays, todayInShowroom } from "@/lib/dates";
import { rentalReturnReminder } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { notify } from "@/lib/notify";
import { alreadyNotified, logNotification, returnReminderFor } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/server";

/** Daily: remind members the day before and the day a rental is due back. Each reminder sends once. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const today = todayInShowroom();

  const { data: rentals, error } = await db
    .from("rentals")
    .select("id, profile_id, starts_on, due_on, pieces(title, vendor, image_url), profiles(email, phone, sms_opt_in)")
    .eq("status", "checked_out")
    .gte("due_on", today)
    .lte("due_on", addDays(today, 1));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const r of rentals ?? []) {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const piece = Array.isArray(r.pieces) ? r.pieces[0] : r.pieces;
    const when = returnReminderFor(r.due_on, today);
    if (!profile || !when) continue;
    const kind = `return_reminder:${when}`;
    if (await alreadyNotified(db, r.id, kind)) continue;

    const errors = await notify(
      { email: profile.email, phone: profile.phone, smsOptIn: profile.sms_opt_in },
      rentalReturnReminder(
        { id: r.id, startsOn: r.starts_on, dueOn: r.due_on, piece: piece ? { title: piece.title, vendor: piece.vendor, imageUrl: piece.image_url } : null },
        when,
      ),
    );
    await logNotification(db, { rentalId: r.id, profileId: r.profile_id, kind, sms: Boolean(profile.sms_opt_in && profile.phone), errors });
    results.push({ rentalId: r.id, kind, errors });
  }
  return NextResponse.json({ today, sent: results.length, results });
}
