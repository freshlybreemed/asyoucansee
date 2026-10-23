import { describe, expect, it } from "vitest";
import { buyNowUrl, displayTitle, formatMoney, groupDesigners, isRentalOnly } from "@/lib/catalog-format";

describe("rental-only titles", () => {
  it.each([
    ["Dan witz Mosh Pit jacket (RENTAL ONLY)", "Dan witz Mosh Pit jacket"],
    ["“Wet” look minidress *Rental Only*", "“Wet” look minidress"],
    ["*Rental only* Crystal knot bra top", "Crystal knot bra top"],
  ])("cleans %s", (raw, clean) => {
    expect(displayTitle(raw)).toBe(clean);
    expect(isRentalOnly(raw, 5000)).toBe(true);
  });

  it("treats placeholder prices as rental only", () => {
    expect(isRentalOnly("Dragon heel", 100_000_000)).toBe(true);
    expect(isRentalOnly("Blair Nebraska Hat", 18_500)).toBe(false);
  });
});

describe("groupDesigners", () => {
  it("merges spelling variants under the most common spelling", () => {
    const groups = groupDesigners(["Marni", "Marni", "MARNI", "RRR-123", "RRR123", "RRR-123", "A Cold Wall", "A-Cold-Wall*"]);
    expect(groups.map((g) => [g.name, g.count])).toEqual([
      ["Marni", 3],
      ["RRR-123", 3],
      ["A Cold Wall", 2],
    ]);
    expect(groups[0].spellings).toEqual(["Marni", "MARNI"]);
  });

  it("prefers mixed case over all caps on ties", () => {
    expect(groupDesigners(["OFF-WHITE", "Off-White"])[0].name).toBe("Off-White");
  });
});

describe("formatting", () => {
  it("formats whole and fractional dollars", () => {
    expect(formatMoney(18_500)).toBe("$185");
    expect(formatMoney(1999)).toBe("$19.99");
  });
  it("builds a cart permalink from a variant gid", () => {
    expect(buyNowUrl("shop.myshopify.com", "gid://shopify/ProductVariant/123")).toBe("https://shop.myshopify.com/cart/123:1");
  });
});
