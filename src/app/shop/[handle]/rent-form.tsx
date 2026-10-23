"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/catalog-format";
import type { Quote } from "@/lib/pricing";
import { getRentalQuote, requestRental } from "./actions";

export function RentForm({ productId, signedIn }: { productId: string; signedIn: boolean }) {
  const [startsOn, setStartsOn] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [quote, setQuote] = useState<Quote>();
  const [message, setMessage] = useState<string>();
  const [requested, setRequested] = useState(false);
  const [pending, startTransition] = useTransition();

  function updateDates(start: string, due: string) {
    setStartsOn(start);
    setDueOn(due);
    setQuote(undefined);
    setMessage(undefined);
    if (!start || !due) return;
    startTransition(async () => {
      const r = await getRentalQuote(productId, start, due);
      setQuote(r.quote);
      setMessage(r.error);
    });
  }

  function submit() {
    startTransition(async () => {
      const r = await requestRental(productId, startsOn, dueOn);
      if (r.ok) setRequested(true);
      else setMessage(r.error);
    });
  }

  if (requested) {
    return (
      <p className="border p-4 text-sm">
        Request sent. We&apos;ll confirm by text or email. Track it on your <Link href="/account" className="underline">account</Link>.
      </p>
    );
  }

  return (
    <div className="space-y-3 border p-4">
      <p className="text-xs uppercase tracking-widest">Rent this piece</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="text-neutral-500">Pick up</span>
          <input type="date" value={startsOn} onChange={(e) => updateDates(e.target.value, dueOn)} className="w-full border px-2 py-1.5" />
        </label>
        <label className="space-y-1">
          <span className="text-neutral-500">Return by</span>
          <input type="date" value={dueOn} min={startsOn} onChange={(e) => updateDates(startsOn, e.target.value)} className="w-full border px-2 py-1.5" />
        </label>
      </div>
      {pending && <p className="text-sm text-neutral-500">Pricing…</p>}
      {quote && (
        <p className="text-sm">
          {quote.days} day{quote.days === 1 ? "" : "s"} · <strong>{formatMoney(quote.totalCents)}</strong>
        </p>
      )}
      {message && <p className="text-sm text-red-600">{message}</p>}
      {signedIn ? (
        <button onClick={submit} disabled={!quote || pending} className="w-full bg-black py-3 text-xs uppercase tracking-widest text-white disabled:opacity-40">
          Request rental
        </button>
      ) : (
        <Link href="/signup" className="block w-full border py-3 text-center text-xs uppercase tracking-widest">
          Join free to rent
        </Link>
      )}
      <p className="text-xs text-neutral-500">Late returns are $30/day, charged to your card on file.</p>
    </div>
  );
}
