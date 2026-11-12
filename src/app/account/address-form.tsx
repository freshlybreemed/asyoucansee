"use client";

import { useActionState } from "react";
import { saveAddress, type AddressState } from "./actions";

type Address = {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
};

/** Address isn't asked for at signup; members add it here before their first rental. */
export function AddressForm({ address }: { address: Address }) {
  const [state, action, pending] = useActionState<AddressState, FormData>(saveAddress, {});
  return (
    <form action={action} className="space-y-3">
      <input name="addressLine1" defaultValue={address.address_line1 ?? ""} placeholder="Street address" required autoComplete="address-line1" className="field" />
      <input name="addressLine2" defaultValue={address.address_line2 ?? ""} placeholder="Apt / suite" autoComplete="address-line2" className="field" />
      <div className="grid grid-cols-3 gap-3">
        <input name="city" defaultValue={address.city ?? ""} placeholder="City" required autoComplete="address-level2" className="field" />
        <input name="region" defaultValue={address.region ?? ""} placeholder="State" required autoComplete="address-level1" className="field" />
        <input name="postalCode" defaultValue={address.postal_code ?? ""} placeholder="ZIP" required autoComplete="postal-code" className="field" />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.saved && <p className="text-sm text-smoke">Address saved.</p>}
      <button disabled={pending} className="btn">{pending ? "Saving…" : "Save address"}</button>
    </form>
  );
}
