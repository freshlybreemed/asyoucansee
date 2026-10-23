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
      <p className="rounded-lg bg-plate p-4 text-sm">
        Request sent. We&apos;ll confirm by text or email. Track it on your <Link href="/account" className="link">account</Link>.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5">
      <p className="wide text-lg">Rent this piece</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="block text-smoke">Pick up</span>
          <input type="date" value={startsOn} onChange={(e) => updateDates(e.target.value, dueOn)} className="field py-2.5" />
        </label>
        <label className="space-y-1">
          <span className="block text-smoke">Return by</span>
          <input type="date" value={dueOn} min={startsOn} onChange={(e) => updateDates(startsOn, e.target.value)} className="field py-2.5" />
        </label>
      </div>
      {pending && <p className="text-sm text-smoke">Pricing…</p>}
      {quote && (
        <p className="flex items-baseline justify-between border-t border-ink/15 pt-3">
          <span className="text-sm text-smoke">{quote.days} day{quote.days === 1 ? "" : "s"}</span>
          <span className="wide text-2xl tabular-nums">{formatMoney(quote.totalCents)}</span>
        </p>
      )}
      {message && <p className="text-sm text-red-700">{message}</p>}
      {signedIn ? (
        <button onClick={submit} disabled={!quote || pending} className="btn w-full">
          Request rental
        </button>
      ) : (
        <Link href="/signup" className="btn-line w-full">
          Join free to rent
        </Link>
      )}
      <p className="text-xs text-smoke">Late returns are $30/day.</p>
    </div>
  );
}
