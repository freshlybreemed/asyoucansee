import { describe, expect, it } from "vitest";
import { computeLateFee } from "@/lib/late-fees";

describe("computeLateFee", () => {
  it("charges nothing on or before the due date", () => {
    expect(computeLateFee({ dueOn: "2026-11-05", today: "2026-11-05" }).newFeeCents).toBe(0);
  });

  it("charges $30 per day late", () => {
    const r = computeLateFee({ dueOn: "2026-11-05", today: "2026-11-08" });
    expect(r).toEqual({ daysLate: 3, newDays: 3, newFeeCents: 9000, chargeThrough: "2026-11-08" });
  });

  it("only bills days not already charged", () => {
    const r = computeLateFee({ dueOn: "2026-11-05", today: "2026-11-08", chargedThrough: "2026-11-07" });
    expect(r.newDays).toBe(1);
    expect(r.newFeeCents).toBe(3000);
  });

  it("is idempotent when run twice the same day", () => {
    const r = computeLateFee({ dueOn: "2026-11-05", today: "2026-11-08", chargedThrough: "2026-11-08" });
    expect(r.newFeeCents).toBe(0);
    expect(r.chargeThrough).toBe("2026-11-08");
  });
});
