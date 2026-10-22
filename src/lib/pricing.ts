/**
 * Rental quote engine. Price = piece daily rate × duration curve × timing × relationship.
 * All multipliers live in PRICING so they can be tuned without touching the math.
 */

export type RelationshipTier = "public" | "member" | "friend" | "family" | "comp";

export const PRICING = {
  /** Default daily rate as a fraction of retail when a piece has no override. */
  dailyRateOfRetail: 0.08,
  minDailyRateCents: 2500,
  /** Above this retail price the Shopify price is a placeholder (e.g. "rental only" at $1M); require an override. */
  maxDerivedRetailCents: 2_000_000,
  /** Discount on each day by bracket: days 1–3 full, 4–7 at 80%, 8+ at 60%. */
  durationBrackets: [
    { fromDay: 1, factor: 1 },
    { fromDay: 4, factor: 0.8 },
    { fromDay: 8, factor: 0.6 },
  ],
  /** Fri/Sat/Sun pickups cost more. */
  weekendMultiplier: 1.2,
  /** Booking with less than this many days' notice. */
  rushNoticeDays: 2,
  rushMultiplier: 1.15,
  /** Dates (YYYY-MM-DD) with high demand, e.g. fashion week, holidays. */
  peakDates: [] as string[],
  peakMultiplier: 1.25,
  relationship: {
    public: 1,
    member: 0.9,
    friend: 0.75,
    family: 0.5,
    comp: 0,
  } satisfies Record<RelationshipTier, number>,
  lateFeePerDayCents: 3000,
};

export interface QuoteInput {
  retailPriceCents: number;
  dailyRateOverrideCents?: number | null;
  startsOn: string; // YYYY-MM-DD
  dueOn: string; // YYYY-MM-DD, inclusive
  tier: RelationshipTier;
  bookedOn: string; // YYYY-MM-DD
  config?: typeof PRICING;
}

export interface Quote {
  days: number;
  dailyRateCents: number;
  durationSubtotalCents: number;
  multipliers: { weekend: number; rush: number; peak: number; relationship: number };
  totalCents: number;
}

const DAY_MS = 86_400_000;

export function parseDate(d: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Invalid date: ${d}`);
  return Date.parse(`${d}T00:00:00Z`);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / DAY_MS);
}

function dateRange(start: string, days: number): string[] {
  const t = parseDate(start);
  return Array.from({ length: days }, (_, i) => new Date(t + i * DAY_MS).toISOString().slice(0, 10));
}

export function dailyRateCents(retailPriceCents: number, override?: number | null, cfg = PRICING): number {
  if (override != null) return override;
  if (retailPriceCents > cfg.maxDerivedRetailCents) {
    throw new Error("Retail price looks like a placeholder; set a daily rate for this piece");
  }
  return Math.max(cfg.minDailyRateCents, Math.round(retailPriceCents * cfg.dailyRateOfRetail));
}

function dayFactor(day: number, cfg: typeof PRICING): number {
  let factor = 1;
  for (const b of cfg.durationBrackets) if (day >= b.fromDay) factor = b.factor;
  return factor;
}

export function quoteRental(input: QuoteInput): Quote {
  const cfg = input.config ?? PRICING;
  const days = daysBetween(input.startsOn, input.dueOn) + 1;
  if (days < 1) throw new Error("Due date must be on or after start date");
  const notice = daysBetween(input.bookedOn, input.startsOn);
  if (notice < 0) throw new Error("Start date is in the past");

  const rate = dailyRateCents(input.retailPriceCents, input.dailyRateOverrideCents, cfg);
  let subtotal = 0;
  for (let day = 1; day <= days; day++) subtotal += rate * dayFactor(day, cfg);

  const startDow = new Date(parseDate(input.startsOn)).getUTCDay();
  const weekend = [0, 5, 6].includes(startDow) ? cfg.weekendMultiplier : 1;
  const rush = notice < cfg.rushNoticeDays ? cfg.rushMultiplier : 1;
  const peak = dateRange(input.startsOn, days).some((d) => cfg.peakDates.includes(d)) ? cfg.peakMultiplier : 1;
  const relationship = cfg.relationship[input.tier];

  return {
    days,
    dailyRateCents: rate,
    durationSubtotalCents: Math.round(subtotal),
    multipliers: { weekend, rush, peak, relationship },
    totalCents: Math.round(subtotal * weekend * rush * peak * relationship),
  };
}
