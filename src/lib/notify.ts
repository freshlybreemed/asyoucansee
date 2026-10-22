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
