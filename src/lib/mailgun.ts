import { env } from "@/lib/env";

/** Replies to any site email land in the main inbox. */
export const REPLY_TO = "contact@asyoucansee.com";

export interface Email {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/** True when Mailgun is configured; lets callers skip optional email quietly. */
export function mailgunConfigured() {
  return Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
}

/**
 * Send one email through Mailgun's HTTP API. Throws on any non-2xx response.
 * MAILGUN_API_BASE defaults to the US region; set https://api.eu.mailgun.net for EU domains.
 */
export async function sendEmail(email: Email): Promise<{ id: string }> {
  const base = (process.env.MAILGUN_API_BASE ?? "https://api.mailgun.net").replace(/\/+$/, "");
  const form = new URLSearchParams();
  form.set("from", env("NOTIFY_FROM_EMAIL"));
  for (const to of [email.to].flat()) form.append("to", to);
  form.set("subject", email.subject);
  form.set("text", email.text);
  if (email.html) form.set("html", email.html);
  form.set("h:Reply-To", email.replyTo ?? REPLY_TO);

  const res = await fetch(`${base}/v3/${env("MAILGUN_DOMAIN")}/messages`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`api:${env("MAILGUN_API_KEY")}`).toString("base64")}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Mailgun ${res.status}: ${await res.text()}`);
  return (await res.json()) as { id: string };
}
