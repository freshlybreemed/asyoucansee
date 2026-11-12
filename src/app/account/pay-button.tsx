"use client";

import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/catalog-format";
import { payRental } from "./actions";

export function PayButton({ rentalId, amountCents }: { rentalId: string; amountCents: number }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await payRental(rentalId);
            setError(r.error);
          })
        }
        className="btn px-4 py-2"
      >
        {pending ? "Paying…" : `Pay ${formatMoney(amountCents)}`}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
