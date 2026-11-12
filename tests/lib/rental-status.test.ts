import { describe, expect, it } from "vitest";
import { allowedActions, balanceCents, nextStatus, rateSettled } from "@/lib/rental-status";

describe("rental lifecycle", () => {
  it("walks the happy path", () => {
    expect(nextStatus("quoted", "confirm")).toBe("confirmed");
    expect(nextStatus("confirmed", "check_out")).toBe("checked_out");
    expect(nextStatus("checked_out", "check_in")).toBe("returned");
  });

  it("checks in late rentals", () => {
    expect(nextStatus("late", "check_in")).toBe("returned");
  });

  it("rejects skipping steps", () => {
    expect(() => nextStatus("requested", "check_out")).toThrow(/check out a requested/);
    expect(() => nextStatus("requested", "confirm")).toThrow(/confirm a requested/);
    expect(() => nextStatus("returned", "check_in")).toThrow();
  });

  it("lists the actions available per status", () => {
    expect(allowedActions("requested")).toEqual(["decline"]);
    expect(allowedActions("quoted")).toEqual(["confirm", "decline"]);
    expect(allowedActions("confirmed")).toEqual(["check_out", "cancel"]);
    expect(allowedActions("returned")).toEqual([]);
  });
});

describe("balanceCents", () => {
  it("adds unpaid rental and late fees", () => {
    expect(balanceCents({ quoted_cents: 10_000, paid_cents: 0, late_fee_cents: 6000, late_fees_paid_cents: 3000 })).toBe(13_000);
  });
  it("owes nothing until a quote is set", () => {
    expect(balanceCents({ quoted_cents: null, paid_cents: 0, late_fee_cents: 0, late_fees_paid_cents: 0 })).toBe(0);
  });
  it("is zero when settled", () => {
    expect(balanceCents({ quoted_cents: 10_000, paid_cents: 10_000, late_fee_cents: 0, late_fees_paid_cents: 0 })).toBe(0);
  });
});

describe("rateSettled", () => {
  it("only lets staff confirm once the rate is fully paid", () => {
    expect(rateSettled({ quoted_cents: null, paid_cents: 0 })).toBe(false);
    expect(rateSettled({ quoted_cents: 12000, paid_cents: 0 })).toBe(false);
    expect(rateSettled({ quoted_cents: 12000, paid_cents: 11999 })).toBe(false);
    expect(rateSettled({ quoted_cents: 12000, paid_cents: 12000 })).toBe(true);
    expect(rateSettled({ quoted_cents: 0, paid_cents: 0 })).toBe(true);
  });
});
