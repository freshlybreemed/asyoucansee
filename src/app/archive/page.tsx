import type { Metadata } from "next";
import { NextPage, PageHeader, ProductGrid } from "@/components/product-card";
import { listProducts } from "@/lib/shopify/catalog";

export const metadata: Metadata = { title: "Sold archive" };

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const { products, nextCursor } = await listProducts({ scope: "sold", after });
  return (
    <div>
      <PageHeader title="Sold archive">
        Pieces that have passed through As You Can See. Looking for something like these? Ask us and we&apos;ll source it.
      </PageHeader>
      <ProductGrid products={products} sold />
      <NextPage cursor={nextCursor} basePath="/archive" />
    </div>
  );
}
