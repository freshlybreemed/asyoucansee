"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <input name="email" type="email" placeholder="Email" required className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" placeholder="Password" required className="w-full rounded border px-3 py-2" />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">Sign in</button>
    </form>
  );
}
