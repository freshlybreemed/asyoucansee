import { describe, expect, it } from "vitest";
import { categoryOf, categorySearch } from "@/lib/catalog/categories";

describe("categoryOf", () => {
  it("groups subcategories under their parent", () => {
    expect(categoryOf("gid://shopify/TaxonomyCategory/aa-8")).toBe("shoes");
    expect(categoryOf("gid://shopify/TaxonomyCategory/aa-8-3")).toBe("shoes");
    expect(categoryOf("aa-1-12-4")).toBe("bottoms");
    expect(categoryOf("aa-1-10-2-2")).toBe("outerwear");
    expect(categoryOf("archived-174")).toBe("tops");
  });

  it("keeps sibling IDs that share a prefix apart", () => {
    expect(categoryOf("aa-1-10")).toBe("outerwear");
    expect(categoryOf("aa-1-12")).toBe("bottoms");
    expect(categoryOf("aa-1-13-8")).toBe("tops");
    expect(categoryOf("aa-1-1-1-4")).toBe("bottoms");
  });

  it("returns null when uncategorized or unknown", () => {
    expect(categoryOf(null)).toBeNull();
    expect(categoryOf("ha-14")).toBeNull();
  });
});

describe("categorySearch", () => {
  it("ORs the group's category IDs", () => {
    expect(categorySearch("shoes")).toBe("(category_id:aa-8*)");
  });
});
