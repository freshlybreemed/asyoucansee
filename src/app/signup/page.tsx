"use client";

import Link from "next/link";
import { use, useActionState } from "react";
import { signUp, type SignupState } from "./actions";

export default function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = use(searchParams);
  const [state, action, pending] = useActionState<SignupState, FormData>(signUp, {});
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="page-title">Become a member</h1>
      <p className="mb-8 mt-4 text-smoke">Free to join. Members can rent any piece in the collection.</p>
      <form action={action} className="space-y-3">
        {next && <input type="hidden" name="next" value={next} />}
        <input name="fullName" placeholder="Full name" required autoComplete="name" className="field" />
        <input name="email" type="email" placeholder="Email" required autoComplete="email" className="field" />
        <input name="password" type="password" placeholder="Password (8+ characters)" required autoComplete="new-password" className="field" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="phone" type="tel" placeholder="Phone" autoComplete="tel" className="field" />
          <input name="socialHandle" placeholder="Instagram @" className="field" />
        </div>
        <label className="flex items-center gap-3 py-1 text-sm">
          <input type="checkbox" name="smsOptIn" className="h-4 w-4 accent-oxblood" /> Text me about my rentals
        </label>
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button disabled={pending} className="btn w-full">{pending ? "Creating your account…" : "Create account"}</button>
      </form>
      <p className="mt-6 text-sm text-smoke">
        Already a member? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="link text-ink">Sign in</Link>
      </p>
    </div>
  );
}
