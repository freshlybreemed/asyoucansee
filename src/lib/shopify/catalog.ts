import { shopifyAdmin } from "./admin";

/** Storefront reads, cached for a few minutes so the site stays fast and within Shopify rate limits. */
const REVALIDATE = 300;

export interface CatalogProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  createdAt: string;
  descriptionHtml: string;
  images: { url: string; altText: string | null; width: number; height: number }[];
  variantId: string;
  priceCents: number;
  compareAtCents: number | null;
  totalInventory: number;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
}

const PRODUCT_FIELDS = `
  id handle title vendor createdAt descriptionHtml totalInventory status
  media(first: 8) { nodes { ... on MediaImage { image { url altText width height } } } }
  variants(first: 1) { nodes { id price compareAtPrice } }
`;

type RawProduct = Omit<CatalogProduct, "images" | "variantId" | "priceCents" | "compareAtCents"> & {
  media: { nodes: { image?: CatalogProduct["images"][number] }[] };
  variants: { nodes: { id: string; price: string; compareAtPrice: string | null }[] };
};

function toProduct(p: RawProduct): CatalogProduct | null {
  const v = p.variants.nodes[0];
  if (!v) return null;
  const compareAt = v.compareAtPrice ? Math.round(parseFloat(v.compareAtPrice) * 100) : 0;
  const price = Math.round(parseFloat(v.price) * 100);
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    vendor: p.vendor,
    createdAt: p.createdAt,
    descriptionHtml: p.descriptionHtml,
    totalInventory: p.totalInventory,
    status: p.status,
    images: p.media.nodes.flatMap((n) => (n.image ? [n.image] : [])),
    variantId: v.id,
    priceCents: price,
    compareAtCents: compareAt > price ? compareAt : null,
  };
}

/** Escape a value for Shopify search syntax. */
function quote(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

export const SEARCH = {
  available: "status:active AND inventory_total:>0",
  /** Hand-picked in Shopify with the `featured` tag. */
  featured: "status:active AND inventory_total:>0 AND tag:featured",
  sold: "(status:archived) OR (status:active AND inventory_total:<1)",
};

export interface ListOptions {
  scope?: keyof typeof SEARCH;
  /** All spellings of one designer, e.g. ["Marni", "MARNI"]. */
  vendors?: string[];
  after?: string | null;
  first?: number;
}

export async function listProducts({ scope = "available", vendors, after = null, first = 24 }: ListOptions = {}) {
  let search = SEARCH[scope];
  if (vendors?.length) search = `(${search}) AND (${vendors.map((v) => `vendor:${quote(v)}`).join(" OR ")})`;

  const data = await shopifyAdmin<{
    products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RawProduct[] };
  }>(
    `query List($first: Int!, $after: String, $search: String!, $sortKey: ProductSortKeys!) {
      products(first: $first, after: $after, query: $search, sortKey: $sortKey, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes { ${PRODUCT_FIELDS} }
      }
    }`,
    { first, after, search, sortKey: scope === "sold" ? "UPDATED_AT" : "CREATED_AT" },
    { revalidate: REVALIDATE },
  );
  return {
    products: data.products.nodes.flatMap((p) => toProduct(p) ?? []),
    nextCursor: data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null,
  };
}

export async function getProduct(handle: string): Promise<CatalogProduct | null> {
  const data = await shopifyAdmin<{ productByIdentifier: RawProduct | null }>(
    `query One($handle: String!) {
      productByIdentifier(identifier: { handle: $handle }) { ${PRODUCT_FIELDS} }
    }`,
    { handle },
    { revalidate: REVALIDATE },
  );
  return data.productByIdentifier ? toProduct(data.productByIdentifier) : null;
}

/** Look up specific products (e.g. rentable pieces from Supabase), skipping any that no longer exist. */
export async function getProductsByIds(ids: string[]): Promise<CatalogProduct[]> {
  if (!ids.length) return [];
  const data = await shopifyAdmin<{ nodes: (RawProduct | null)[] }>(
    `query Many($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { ${PRODUCT_FIELDS} } } }`,
    { ids },
    { revalidate: REVALIDATE },
  );
  return data.nodes.flatMap((p) => (p?.id ? toProduct(p) ?? [] : []));
}
