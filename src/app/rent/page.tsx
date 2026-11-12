import type { Metadata } from "next";
import Link from "next/link";
import { NextPage, ProductGrid } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { isCategoryKey } from "@/lib/catalog/categories";
import { listDesigners } from "@/lib/catalog/designers";
import { listProducts } from "@/lib/shopify/catalog";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rent" };

const steps = [
  "Join free. It takes a minute.",
  "Pick a piece, your dates, what it's for and your budget.",
  "We reach out to work out your rate. Pay on your account to lock it in.",
  "Pick up at the showroom.",
  "Return by the due date. Late returns are $30/day.",
];

export default async function RentPage({ searchParams }: { searchParams: Promise<{ after?: string; q?: string; category?: string; designer?: string }> }) {
  const { after, q, category: rawCategory, designer: designerKey } = await searchParams;
  const category = isCategoryKey(rawCategory) ? rawCategory : undefined;
  const designers = await listDesigners();
  const designer = designers.find((d) => d.key === designerKey);
  const values = { q, category, designer: designer?.key };
  // Everything in stock is rentable unless an admin opted it out.
  const [{ products, nextCursor }, { data: optedOut, error }] = await Promise.all([
    listProducts({ after, query: q, category, vendors: designer?.spellings }),
    createAdminClient().from("pieces").select("shopify_product_id").eq("is_rentable", false),
  ]);
  if (error) throw new Error(error.message);
  const hidden = new Set(optedOut.map((p) => p.shopify_product_id));

  return (
    <div className="space-y-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="page-title">Rent the archive</h1>
          <p className="max-w-md text-lg text-smoke">
            Your favorite pieces at a fraction of the price. From red carpets and music videos to the party (and the
            after party). Every piece in the shop can be rented, and membership is free.
          </p>
          <Link href="/signup" className="btn">
            Join free
          </Link>
        </div>
        <ol className="space-y-4 self-end">
          {steps.map((s, i) => (
            <li key={s} className="grid grid-cols-[3rem_1fr] items-baseline border-t border-ink/15 pt-4">
              <span className="display text-2xl text-oxblood">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <ShopFilters basePath="/rent" designers={designers} values={values} />
        <ProductGrid products={products.filter((p) => !hidden.has(p.id))} />
      </div>
      <NextPage cursor={nextCursor} basePath="/rent" params={values} />
    </div>
  );
}
