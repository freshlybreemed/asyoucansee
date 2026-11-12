import twilio from "twilio";
import type { EmailContent } from "@/lib/email/layout";
import { env } from "@/lib/env";
import { mailgunConfigured, sendEmail } from "@/lib/mailgun";

export { siteUrl } from "@/lib/site-url";

export interface Recipient {
  email: string;
  phone?: string | null;
  smsOptIn?: boolean;
}

/** Email always; SMS only when the member opted in and gave a number. Returns per-channel errors. */
export async function notify(to: Recipient, email: EmailContent) {
  const errors: { channel: "email" | "sms"; error: string }[] = [];
  try {
    await sendEmail({ to: to.email, subject: email.subject, text: email.text, html: email.html });
  } catch (e) {
    errors.push({ channel: "email", error: String(e) });
  }
  if (to.smsOptIn && to.phone) {
    try {
      await twilio(env("TWILIO_ACCOUNT_SID"), env("TWILIO_AUTH_TOKEN")).messages.create({
        from: env("TWILIO_FROM_NUMBER"),
        to: to.phone,
        body: email.sms,
      });
    } catch (e) {
      errors.push({ channel: "sms", error: String(e) });
    }
  }
  if (errors.length) console.error("notify failed", errors);
  return errors;
}

/** Alert the team (ADMIN_NOTIFY_EMAILS, comma-separated) about something to review. Never throws. */
export async function notifyStaff(email: EmailContent) {
  const to = (process.env.ADMIN_NOTIFY_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!to.length || !mailgunConfigured()) return;
  try {
    await sendEmail({ to, subject: email.subject, text: email.text, html: email.html });
  } catch (e) {
    console.error("notifyStaff failed", e);
  }
}
