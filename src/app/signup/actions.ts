"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUserClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional(),
  socialHandle: z.string().trim().optional(),
  addressLine1: z.string().trim().min(1, "Address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  region: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  smsOptIn: z.boolean(),
});

export type SignupState = { error?: string };

export async function signUp(_prev: SignupState, form: FormData): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    ...Object.fromEntries(form),
    smsOptIn: form.get("smsOptIn") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form" };
  const f = parsed.data;

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signUp({ email: f.email, password: f.password });
  if (error || !data.user) return { error: error?.message ?? "Sign up failed" };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: f.fullName,
    email: f.email,
    phone: f.phone || null,
    social_handle: f.socialHandle || null,
    address_line1: f.addressLine1,
    address_line2: f.addressLine2 || null,
    city: f.city,
    region: f.region,
    postal_code: f.postalCode,
    sms_opt_in: f.smsOptIn,
  });
  if (profileError) return { error: profileError.message };

  redirect("/account");
}
