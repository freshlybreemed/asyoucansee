import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml } from "@/lib/email/layout";
import { formatDay, rentalConfirmed, rentalQuoted, rentalRef, staffConsignment, staffRentalRequest } from "@/lib/email/templates";

const r = {
  id: "3f9c2a7e-1b44-4d0a-9e61-7c2b5d8e0a11",
  startsOn: "2026-11-20",
  dueOn: "2026-11-23",
  piece: { title: "Tabi <boots>", vendor: "Maison Margiela", imageUrl: "https://cdn.shopify.com/s/files/x.jpg?v=1" },
};

describe("email templates", () => {
  beforeEach(() => vi.stubEnv("SITE_URL", "https://aycs.test/"));
  afterEach(() => vi.unstubAllEnvs());

  it("formats order refs and calendar days without timezone drift", () => {
    expect(rentalRef(r.id)).toBe("AYCS-3F9C2A7E");
    expect(formatDay("2026-11-20")).toBe("Fri, Nov 20, 2026");
  });

  it("links member emails to the rental's order page", () => {
    const e = rentalQuoted(r, 12000);
    expect(e.subject).toContain("Your rate is ready");
    expect(e.html).toContain(`href="https://aycs.test/account/rentals/${r.id}"`);
    expect(e.html).toContain("Review and pay $120");
    expect(e.text).toContain(`https://aycs.test/account/rentals/${r.id}`);
    expect(e.sms).toContain("$120");
  });

  it("escapes catalog text and sizes Shopify images", () => {
    const e = rentalConfirmed(r, 12000);
    expect(e.html).toContain("Tabi &lt;boots&gt;");
    expect(e.html).not.toContain("Tabi <boots>");
    expect(e.html).toContain("width=800");
    expect(e.html).toContain('src="https://aycs.test/brand/monogram.png"');
  });

  it("links staff alerts to the admin entry", () => {
    expect(staffRentalRequest(r, { name: "A", tier: "member", budgetCents: null, suggestedCents: 12000 }).html).toContain(
      `https://aycs.test/admin#rental-${r.id}`,
    );
    const c = staffConsignment({ id: "c1", fullName: "A", email: "a@x.com", designers: "Rick", items: "Boots", photoCount: 0 });
    expect(c.html).toContain("https://aycs.test/admin/consignments#consignment-c1");
    expect(c.html).toContain("Staff alert");
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
