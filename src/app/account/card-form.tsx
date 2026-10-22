"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { markCardSaved, startCardSetup } from "./actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function SaveCard({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    const result = await stripe.confirmSetup({ elements, redirect: "if_required" });
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    await markCardSaved();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={!stripe || saving} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {saving ? "Saving…" : "Save card"}
      </button>
    </form>
  );
}

export function CardForm({ hasCard }: { hasCard: boolean }) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [saved, setSaved] = useState(hasCard);

  if (saved && !clientSecret) {
    return (
      <p className="text-sm">
        Card on file ✓{" "}
        <button className="underline" onClick={async () => setClientSecret((await startCardSetup()).clientSecret)}>
          Replace
        </button>
      </p>
    );
  }
  if (!clientSecret) {
    return (
      <button
        className="rounded bg-black px-4 py-2 text-white"
        onClick={async () => setClientSecret((await startCardSetup()).clientSecret)}
      >
        Add a card
      </button>
    );
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <SaveCard onDone={() => { setSaved(true); setClientSecret(undefined); }} />
    </Elements>
  );
}
