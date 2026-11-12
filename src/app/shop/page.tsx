import type { Metadata } from "next";
import { NextPage, PageHeader, ProductGrid } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { isCategoryKey } from "@/lib/catalog/categories";
import { listDesigners } from "@/lib/catalog/designers";
import { listProducts } from "@/lib/shopify/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ after?: string; q?: string; category?: string; designer?: string }> }) {
  const { after, q, category: rawCategory, designer: designerKey } = await searchParams;
  const category = isCategoryKey(rawCategory) ? rawCategory : undefined;
  const designers = await listDesigners();
  const designer = designers.find((d) => d.key === designerKey);
  const { products, nextCursor } = await listProducts({ after, query: q, category, vendors: designer?.spellings });
  const values = { q, category, designer: designer?.key };
  return (
    <div>
      <PageHeader title="Shop">Archive and runway pieces, newest first. Everything here can be rented too.</PageHeader>
      <ShopFilters basePath="/shop" designers={designers} values={values} />
      <ProductGrid products={products} />
      <NextPage cursor={nextCursor} basePath="/shop" params={values} />
    </div>
  );
}
