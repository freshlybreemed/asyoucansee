"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const ConsignSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().optional(),
  socialHandle: z.string().trim().optional(),
  city: z.string().trim().optional(),
  designers: z.string().trim().min(1, "Which designers?"),
  items: z.string().trim().min(10, "Tell us a little about the pieces"),
  estimatedValue: z.string().trim().optional(),
  photosUrl: z.string().trim().optional(),
});

export type ConsignState = { ok?: true; error?: string };

export async function submitConsignment(_prev: ConsignState, form: FormData): Promise<ConsignState> {
  if (form.get("company")) return { ok: true }; // honeypot: bots fill hidden fields
  const parsed = ConsignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const f = parsed.data;
  const { error } = await createAdminClient().from("consignments").insert({
    full_name: f.fullName,
    email: f.email,
    phone: f.phone || null,
    social_handle: f.socialHandle || null,
    city: f.city || null,
    designers: f.designers,
    items: f.items,
    estimated_value: f.estimatedValue || null,
    photos_url: f.photosUrl || null,
  });
  if (error) return { error: "Something went wrong. Try again or DM us." };
  return { ok: true };
}
