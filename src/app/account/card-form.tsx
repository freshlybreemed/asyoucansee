"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { markCardSaved, startCardSetup } from "./actions";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

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
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={!stripe || saving} className="btn">
        {saving ? "Saving…" : "Save card"}
      </button>
    </form>
  );
}

export function CardForm({ hasCard }: { hasCard: boolean }) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [saved, setSaved] = useState(hasCard);

  if (!stripePromise) return <p className="text-sm text-smoke">No card needed yet. Pay at pickup in the showroom.</p>;

  if (saved && !clientSecret) {
    return (
      <p className="text-sm">
        Card on file ✓{" "}
        <button className="link" onClick={async () => setClientSecret((await startCardSetup()).clientSecret)}>
          Replace
        </button>
      </p>
    );
  }
  if (!clientSecret) {
    return (
      <button
        className="btn"
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
