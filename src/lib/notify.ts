import { Resend } from "resend";
import twilio from "twilio";
import { env } from "@/lib/env";

export interface Recipient {
  email: string;
  phone?: string | null;
  smsOptIn?: boolean;
}

/** Email always; SMS only when the member opted in and gave a number. Returns per-channel errors. */
export async function notify(to: Recipient, subject: string, body: string) {
  const errors: { channel: "email" | "sms"; error: string }[] = [];
  try {
    await new Resend(env("RESEND_API_KEY")).emails.send({ from: env("NOTIFY_FROM_EMAIL"), to: to.email, subject, text: body });
  } catch (e) {
    errors.push({ channel: "email", error: String(e) });
  }
  if (to.smsOptIn && to.phone) {
    try {
      await twilio(env("TWILIO_ACCOUNT_SID"), env("TWILIO_AUTH_TOKEN")).messages.create({
        from: env("TWILIO_FROM_NUMBER"),
        to: to.phone,
        body: `${subject}: ${body}`,
      });
    } catch (e) {
      errors.push({ channel: "sms", error: String(e) });
    }
  }
  return errors;
}

/** Alert the team (ADMIN_NOTIFY_EMAILS, comma-separated) about something to review. Never throws. */
export async function notifyStaff(subject: string, body: string, adminPath = "/admin") {
  const to = (process.env.ADMIN_NOTIFY_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!to.length || !process.env.RESEND_API_KEY) return;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const link = `${host ? `https://${host}` : "http://localhost:3100"}${adminPath}`;
  try {
    await new Resend(env("RESEND_API_KEY")).emails.send({ from: env("NOTIFY_FROM_EMAIL"), to, subject, text: `${body}\n\n${link}` });
  } catch (e) {
    console.error("notifyStaff failed", e);
  }
}
