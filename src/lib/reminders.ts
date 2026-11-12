import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/dates";

export type ReturnReminder = "due_tomorrow" | "due_today";

/** Which return reminder (if any) a rental that's out with a member should get today. */
export function returnReminderFor(dueOn: string, today: string): ReturnReminder | null {
  if (dueOn === today) return "due_today";
  if (dueOn === addDays(today, 1)) return "due_tomorrow";
  return null;
}

/** True if this kind of message already went out for the rental, so a re-run cron never double-sends. */
export async function alreadyNotified(db: SupabaseClient, rentalId: string, kind: string): Promise<boolean> {
  const { data } = await db.from("notifications").select("id").eq("rental_id", rentalId).eq("kind", kind).is("error", null).limit(1);
  return Boolean(data?.length);
}

/** Record what was sent (one row per channel attempted) in the notifications log. */
export async function logNotification(
  db: SupabaseClient,
  row: { rentalId: string; profileId: string; kind: string; sms: boolean; errors: { channel: "email" | "sms"; error: string }[] },
) {
  const channels: ("email" | "sms")[] = row.sms ? ["email", "sms"] : ["email"];
  await db.from("notifications").insert(
    channels.map((channel) => ({
      rental_id: row.rentalId,
      profile_id: row.profileId,
      channel,
      kind: row.kind,
      error: row.errors.find((e) => e.channel === channel)?.error ?? null,
    })),
  );
}
