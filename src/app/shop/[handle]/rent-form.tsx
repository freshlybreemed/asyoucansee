"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestRental } from "./actions";

const SIGNED_OUT = "Sign in to rent.";

export function RentForm({ productId, signedIn, path }: { productId: string; signedIn: boolean; path: string }) {
  const back = `?next=${encodeURIComponent(path)}`;
  const [startsOn, setStartsOn] = useState("");
  const [message, setMessage] = useState<string>();
  const [requested, setRequested] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    setMessage(undefined);
    startTransition(async () => {
      const r = await requestRental(productId, {
        startsOn: String(form.get("startsOn") ?? ""),
        dueOn: String(form.get("dueOn") ?? ""),
        occasion: String(form.get("occasion") ?? ""),
        budget: String(form.get("budget") ?? ""),
      });
      if (r.ok) setRequested(true);
      else if (r.error === SIGNED_OUT) window.location.href = `/login${back}`;
      else setMessage(r.error);
    });
  }

  if (requested) {
    return (
      <p className="rounded-lg bg-plate p-4 text-sm">
        Request sent. We&apos;ll reach out to work out your rate, then you can pay on your{" "}
        <Link href="/account" className="link">account</Link> to lock it in.
      </p>
    );
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl bg-white p-5">
      <p className="wide text-lg">Rent this piece</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="block text-smoke">Pick up</span>
          <input type="date" name="startsOn" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className="field py-2.5" />
        </label>
        <label className="space-y-1">
          <span className="block text-smoke">Return by</span>
          <input type="date" name="dueOn" required min={startsOn} className="field py-2.5" />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="block text-smoke">What&apos;s it for?</span>
        <textarea name="occasion" rows={2} placeholder="Shoot, event, editorial…" className="field py-2.5" />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="block text-smoke">Your budget</span>
        <input name="budget" inputMode="decimal" placeholder="$" className="field py-2.5" />
      </label>
      {message && <p className="text-sm text-red-700">{message}</p>}
      {signedIn ? (
        <button disabled={pending} className="btn w-full">
          {pending ? "Sending…" : "Request a rate"}
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/login${back}`} className="btn w-full">Sign in</Link>
          <Link href={`/signup${back}`} className="btn-line w-full">Join free</Link>
        </div>
      )}
      <p className="text-xs text-smoke">Rates depend on the piece, dates and use. Late returns are $30/day.</p>
    </form>
  );
}
