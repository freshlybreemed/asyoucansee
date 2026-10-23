/** Pure display helpers for the storefront: titles, prices, designer names, buy links. */

const RENTAL_ONLY = /\s*[*(]*\s*rental\s*only\s*[*)]*\s*/i;
/** Shopify prices at or above this are placeholders used to block purchase (e.g. $1M rental-only listings). */
export const PLACEHOLDER_PRICE_CENTS = 2_000_000;

export function isRentalOnly(title: string, priceCents: number): boolean {
  return RENTAL_ONLY.test(title) || priceCents >= PLACEHOLDER_PRICE_CENTS;
}

/** Strip "*rental only*" markers that live in Shopify titles. */
export function displayTitle(title: string): string {
  return title.replace(RENTAL_ONLY, " ").replace(/\s+/g, " ").trim();
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Key that collapses spelling variants: "MARNI"/"Marni", "RRR-123"/"RRR123", "A Cold Wall"/"A-Cold-Wall*". */
export function designerKey(vendor: string): string {
  return vendor.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export interface Designer {
  key: string;
  name: string; // most common spelling
  spellings: string[];
  count: number;
}

/** Group vendor names into designers, naming each by its most-used spelling. */
export function groupDesigners(vendors: string[]): Designer[] {
  const byKey = new Map<string, Map<string, number>>();
  for (const v of vendors) {
    if (!v?.trim()) continue;
    const key = designerKey(v);
    const spellings = byKey.get(key) ?? new Map<string, number>();
    spellings.set(v, (spellings.get(v) ?? 0) + 1);
    byKey.set(key, spellings);
  }
  return [...byKey.entries()]
    .map(([key, spellings]) => {
      // Stable sort: most used, then mixed case over ALL CAPS, then first seen.
      const sorted = [...spellings.entries()].sort(
        (a, b) => b[1] - a[1] || Number(isAllCaps(a[0])) - Number(isAllCaps(b[0])),
      );
      return {
        key,
        name: sorted[0][0],
        spellings: sorted.map(([s]) => s),
        count: sorted.reduce((n, [, c]) => n + c, 0),
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function isAllCaps(s: string): boolean {
  return s === s.toUpperCase() && s !== s.toLowerCase();
}

/** Shopify cart permalink: sends the shopper straight to Shopify checkout with this variant. */
export function buyNowUrl(storeDomain: string, variantGid: string): string {
  const id = variantGid.split("/").pop();
  return `https://${storeDomain}/cart/${id}:1`;
}
