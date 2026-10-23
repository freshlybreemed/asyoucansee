/** Rental lifecycle: which admin actions are allowed from each status. */

export type RentalStatus = "requested" | "confirmed" | "checked_out" | "returned" | "late" | "cancelled";
export type RentalAction = "confirm" | "decline" | "check_out" | "check_in" | "cancel";

const TRANSITIONS: Record<RentalAction, { from: RentalStatus[]; to: RentalStatus }> = {
  confirm: { from: ["requested"], to: "confirmed" },
  decline: { from: ["requested"], to: "cancelled" },
  // Key order is button order in the admin: primary action before cancel.
  check_out: { from: ["confirmed"], to: "checked_out" },
  cancel: { from: ["confirmed"], to: "cancelled" },
  check_in: { from: ["checked_out", "late"], to: "returned" },
};

export function nextStatus(current: RentalStatus, action: RentalAction): RentalStatus {
  const t = TRANSITIONS[action];
  if (!t.from.includes(current)) throw new Error(`Can't ${action.replace("_", " ")} a ${current.replace("_", " ")} rental`);
  return t.to;
}

export function allowedActions(current: RentalStatus): RentalAction[] {
  return (Object.keys(TRANSITIONS) as RentalAction[]).filter((a) => TRANSITIONS[a].from.includes(current));
}

/** Amount still owed: rental total plus late fees, minus what's been paid. */
export function balanceCents(r: { quoted_cents: number; late_fee_cents: number; paid_cents: number; late_fees_paid_cents: number }) {
  return Math.max(0, r.quoted_cents - r.paid_cents) + Math.max(0, r.late_fee_cents - r.late_fees_paid_cents);
}
