"use client";

import { useActionState } from "react";
import { signUp, type SignupState } from "./actions";

const field = "w-full rounded border px-3 py-2";

export default function SignupPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signUp, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-2xl font-semibold">Become a member</h1>
      <input name="fullName" placeholder="Full name" required className={field} />
      <input name="email" type="email" placeholder="Email" required className={field} />
      <input name="password" type="password" placeholder="Password (8+ characters)" required className={field} />
      <input name="phone" type="tel" placeholder="Phone" className={field} />
      <input name="socialHandle" placeholder="Instagram @" className={field} />
      <input name="addressLine1" placeholder="Street address" required className={field} />
      <input name="addressLine2" placeholder="Apt / suite" className={field} />
      <div className="grid grid-cols-3 gap-2">
        <input name="city" placeholder="City" required className={field} />
        <input name="region" placeholder="State" required className={field} />
        <input name="postalCode" placeholder="ZIP" required className={field} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="smsOptIn" /> Text me rental reminders
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-sm text-neutral-600">You&apos;ll add a card on the next screen.</p>
    </form>
  );
}
