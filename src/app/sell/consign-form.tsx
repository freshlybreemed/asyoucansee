"use client";

import { useActionState } from "react";
import { submitConsignment, type ConsignState } from "./actions";

const field = "w-full border px-3 py-2 text-sm";

export function ConsignForm() {
  const [state, action, pending] = useActionState<ConsignState, FormData>(submitConsignment, {});
  if (state.ok) {
    return <p className="border p-6">Got it. We review every submission and will reach out within a few days.</p>;
  }
  return (
    <form action={action} className="space-y-3">
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="fullName" placeholder="Name" required className={field} />
        <input name="email" type="email" placeholder="Email" required className={field} />
        <input name="phone" type="tel" placeholder="Phone" className={field} />
        <input name="socialHandle" placeholder="Instagram @" className={field} />
      </div>
      <input name="city" placeholder="City" className={field} />
      <input name="designers" placeholder="Designers (e.g. Rick Owens, JPG, Margiela)" required className={field} />
      <textarea name="items" rows={5} placeholder="What are you selling? Pieces, seasons, sizes, condition." required className={field} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="estimatedValue" placeholder="Rough total value (optional)" className={field} />
        <input name="photosUrl" placeholder="Link to photos (Drive, Dropbox, IG)" className={field} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full bg-black py-3 text-xs uppercase tracking-widest text-white disabled:opacity-50">
        {pending ? "Sending…" : "Submit your pieces"}
      </button>
    </form>
  );
}
