import { env } from "@/lib/env";

const API_VERSION = "2025-07";

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Admin API token. Uses SHOPIFY_ADMIN_TOKEN if set (legacy custom app); otherwise exchanges the
 * Dev Dashboard app's client ID/secret for a short-lived token (client credentials grant).
 */
async function accessToken(): Promise<string> {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`https://${env("SHOPIFY_STORE_DOMAIN")}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env("SHOPIFY_CLIENT_ID"),
      client_secret: env("SHOPIFY_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify token ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return json.access_token;
}

export async function shopifyAdmin<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${env("SHOPIFY_STORE_DOMAIN")}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await accessToken() },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`Shopify: ${json.errors.map((e) => e.message).join("; ")}`);
  return json.data;
}

export interface ShopifyPiece {
  productId: string;
  variantId: string;
  inventoryItemId: string;
  title: string;
  vendor: string;
  imageUrl: string | null;
  priceCents: number;
}

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title vendor
        featuredMedia { preview { image { url } } }
        variants(first: 1) { nodes { id price inventoryItem { id } } }
      }
    }
  }`;

type ProductsResponse = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: {
      id: string;
      title: string;
      vendor: string;
      featuredMedia: { preview: { image: { url: string } | null } | null } | null;
      variants: { nodes: { id: string; price: string; inventoryItem: { id: string } }[] };
    }[];
  };
};

/** Every product's first variant. Archive pieces are one-of-one, so one variant is the norm. */
export async function fetchAllPieces(): Promise<ShopifyPiece[]> {
  const pieces: ShopifyPiece[] = [];
  let cursor: string | null = null;
  do {
    const data: ProductsResponse = await shopifyAdmin<ProductsResponse>(PRODUCTS_QUERY, { cursor });
    for (const p of data.products.nodes) {
      const v = p.variants.nodes[0];
      if (!v) continue;
      pieces.push({
        productId: p.id,
        variantId: v.id,
        inventoryItemId: v.inventoryItem.id,
        title: p.title,
        vendor: p.vendor,
        imageUrl: p.featuredMedia?.preview?.image?.url ?? null,
        priceCents: Math.round(parseFloat(v.price) * 100),
      });
    }
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);
  return pieces;
}

/**
 * Pull a piece off the Shopify storefront while it's out on rental (delta -1 → sold out),
 * and put it back on return (delta +1).
 */
export async function adjustAvailable(inventoryItemId: string, delta: number, reason: "rental_out" | "rental_return") {
  const data = await shopifyAdmin<{
    inventoryAdjustQuantities: { userErrors: { field: string[]; message: string }[] };
  }>(
    `mutation Adjust($input: InventoryAdjustQuantitiesInput!) {
      inventoryAdjustQuantities(input: $input) { userErrors { field message } }
    }`,
    {
      input: {
        name: "available",
        reason: "correction",
        referenceDocumentUri: `asyoucansee://rentals/${reason}`,
        changes: [{ delta, inventoryItemId, locationId: env("SHOPIFY_LOCATION_ID") }],
      },
    },
  );
  const errors = data.inventoryAdjustQuantities.userErrors;
  if (errors.length) throw new Error(`Shopify inventory: ${errors.map((e) => e.message).join("; ")}`);
}
