import { describe, expect, it } from "vitest";
import { PRICING, dailyRateCents, quoteRental } from "@/lib/pricing";

// 2026-11-03 is a Tuesday.
const base = { retailPriceCents: 50_000, tier: "public" as const, startsOn: "2026-11-03", bookedOn: "2026-10-22" };

describe("dailyRateCents", () => {
  it("derives from retail with a floor", () => {
    expect(dailyRateCents(50_000)).toBe(4000);
    expect(dailyRateCents(9_000)).toBe(PRICING.minDailyRateCents);
  });
  it("respects a per-piece override", () => {
    expect(dailyRateCents(50_000, 1234)).toBe(1234);
  });
  it("requires an override for placeholder retail prices", () => {
    expect(() => dailyRateCents(100_000_000)).toThrow(/placeholder/);
    expect(dailyRateCents(100_000_000, 15_000)).toBe(15_000);
  });
});

describe("quoteRental", () => {
  it("prices a single weekday at the daily rate", () => {
    const q = quoteRental({ ...base, dueOn: "2026-11-03" });
    expect(q.days).toBe(1);
    expect(q.totalCents).toBe(4000);
  });

  it("discounts longer rentals by bracket", () => {
    // 10 days: 3×1 + 4×0.8 + 3×0.6 = 8.0 day-equivalents
    const q = quoteRental({ ...base, dueOn: "2026-11-12" });
    expect(q.days).toBe(10);
    expect(q.totalCents).toBe(32_000);
  });

  it("applies weekend, rush, peak, and relationship multipliers", () => {
    const q = quoteRental({
      ...base,
      startsOn: "2026-11-06", // Friday
      dueOn: "2026-11-06",
      bookedOn: "2026-11-05", // 1 day notice
      tier: "friend",
      config: { ...PRICING, peakDates: ["2026-11-06"] },
    });
    expect(q.multipliers).toEqual({ weekend: 1.2, rush: 1.15, peak: 1.25, relationship: 0.75 });
    expect(q.totalCents).toBe(Math.round(4000 * 1.2 * 1.15 * 1.25 * 0.75));
  });

  it("comps to zero", () => {
    expect(quoteRental({ ...base, dueOn: "2026-11-05", tier: "comp" }).totalCents).toBe(0);
  });

  it("rejects bad ranges", () => {
    expect(() => quoteRental({ ...base, dueOn: "2026-11-01" })).toThrow();
    expect(() => quoteRental({ ...base, bookedOn: "2026-11-10", dueOn: "2026-11-04" })).toThrow();
  });
});
