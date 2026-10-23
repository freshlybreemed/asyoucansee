"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(signIn, {});
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-8">Sign in</h1>
      <form action={action} className="space-y-3">
        <input name="email" type="email" placeholder="Email" required autoComplete="email" className="field" />
        <input name="password" type="password" placeholder="Password" required autoComplete="current-password" className="field" />
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button disabled={pending} className="btn w-full">{pending ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="mt-6 text-sm text-smoke">
        New here? <Link href="/signup" className="link text-ink">Become a member</Link>. It&apos;s free.
      </p>
    </div>
  );
}
