"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/next-path";
import { createUserClient } from "@/lib/supabase/server";

export async function signIn(_prev: { error?: string }, form: FormData) {
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/");
}
