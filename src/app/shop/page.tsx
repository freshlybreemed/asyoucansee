import type { Metadata } from "next";
import { NextPage, PageHeader, ProductGrid } from "@/components/product-card";
import { listProducts } from "@/lib/shopify/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const { products, nextCursor } = await listProducts({ after });
  return (
    <div>
      <PageHeader title="Shop">Archive and runway pieces, newest first. Everything here can be rented too.</PageHeader>
      <ProductGrid products={products} />
      <NextPage cursor={nextCursor} basePath="/shop" />
    </div>
  );
}
