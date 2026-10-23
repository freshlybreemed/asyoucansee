import { notFound } from "next/navigation";
import { NextPage, PageHeader, ProductGrid } from "@/components/product-card";
import { findDesigner } from "@/lib/catalog/designers";
import { listProducts } from "@/lib/shopify/catalog";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const designer = await findDesigner((await params).key);
  return { title: designer?.name ?? "Designer" };
}

export default async function DesignerPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ after?: string }>;
}) {
  const [{ key }, { after }] = await Promise.all([params, searchParams]);
  const designer = await findDesigner(key);
  if (!designer) notFound();
  const { products, nextCursor } = await listProducts({ vendors: designer.spellings, after });
  return (
    <div>
      <PageHeader title={designer.name}>{designer.count} pieces in the collection.</PageHeader>
      <ProductGrid products={products} />
      <NextPage cursor={nextCursor} basePath={`/designers/${key}`} />
    </div>
  );
}
