"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/next-path";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional(),
  socialHandle: z.string().trim().optional(),
  smsOptIn: z.boolean(),
});

export type SignupState = { error?: string };

/**
 * Create the auth user and profile together with the service role, then sign in.
 * (Client-side signUp has no session until email is confirmed, so RLS rejects the profile insert.)
 */
export async function signUp(_prev: SignupState, form: FormData): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    ...Object.fromEntries(form),
    smsOptIn: form.get("smsOptIn") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid form" };
  const f = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: f.email,
    password: f.password,
    email_confirm: true,
    user_metadata: { full_name: f.fullName },
  });
  if (error || !data.user) {
    const taken = error?.message.toLowerCase().includes("already");
    return { error: taken ? "An account with that email already exists. Sign in instead." : error?.message ?? "Sign up failed" };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: f.fullName,
    email: f.email,
    phone: f.phone || null,
    social_handle: f.socialHandle || null,
    sms_opt_in: f.smsOptIn,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id); // don't leave a login with no profile
    return { error: profileError.message };
  }

  const supabase = await createUserClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
  if (signInError) return { error: signInError.message };

  redirect(safeNext(form.get("next")));
}
