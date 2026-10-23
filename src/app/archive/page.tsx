import type { Metadata } from "next";
import { NextPage, ProductGrid } from "@/components/product-card";
import { listProducts } from "@/lib/shopify/catalog";

export const metadata: Metadata = { title: "Sold archive" };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const { products, nextCursor } = await listProducts({ scope: "sold", after });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Sold archive</h1>
        <p className="mt-2 max-w-xl text-neutral-600">
          Pieces that have passed through As You Can See. Looking for something like these? Ask us and we&apos;ll source it.
        </p>
      </div>
      <ProductGrid products={products} sold />
      <NextPage cursor={nextCursor} basePath="/archive" />
    </div>
  );
}
