import type { Metadata } from "next";
import { NextPage, ProductGrid } from "@/components/product-card";
import { listProducts } from "@/lib/shopify/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const { products, nextCursor } = await listProducts({ after });
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Shop</h1>
      <ProductGrid products={products} />
      <NextPage cursor={nextCursor} basePath="/shop" />
    </div>
  );
}
