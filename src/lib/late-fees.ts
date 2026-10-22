import { PRICING, daysBetween } from "./pricing";

export interface LateFeeInput {
  dueOn: string; // YYYY-MM-DD, last day the piece may be kept
  today: string; // YYYY-MM-DD
  chargedThrough?: string | null; // last day already billed
  perDayCents?: number;
}

export interface LateFeeResult {
  daysLate: number;
  /** Days not yet billed. */
  newDays: number;
  newFeeCents: number;
  chargeThrough: string | null;
}

/** $30/day for each full day past the due date, billing only days not already charged. */
export function computeLateFee({ dueOn, today, chargedThrough, perDayCents = PRICING.lateFeePerDayCents }: LateFeeInput): LateFeeResult {
  const daysLate = Math.max(0, daysBetween(dueOn, today));
  const alreadyBilled = chargedThrough ? Math.max(0, daysBetween(dueOn, chargedThrough)) : 0;
  const newDays = Math.max(0, daysLate - alreadyBilled);
  return {
    daysLate,
    newDays,
    newFeeCents: newDays * perDayCents,
    chargeThrough: newDays > 0 ? today : chargedThrough ?? null,
  };
}
