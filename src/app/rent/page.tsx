import type { Metadata } from "next";
import Link from "next/link";
import { NextPage, ProductGrid } from "@/components/product-card";
import { listProducts } from "@/lib/shopify/catalog";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rent" };

const steps = [
  "Join free. It takes a minute.",
  "Pick a piece and your dates. You'll see the price right away.",
  "We confirm by text or email. Pick up at the showroom.",
  "Return by the due date. Late returns are $30/day.",
];

export default async function RentPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  // Everything in stock is rentable unless an admin opted it out.
  const [{ products, nextCursor }, { data: optedOut, error }] = await Promise.all([
    listProducts({ after }),
    createAdminClient().from("pieces").select("shopify_product_id").eq("is_rentable", false),
  ]);
  if (error) throw new Error(error.message);
  const hidden = new Set(optedOut.map((p) => p.shopify_product_id));

  return (
    <div className="space-y-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold md:text-4xl">Rent the archive</h1>
          <p className="text-neutral-600">
            Every piece in the shop is available to rent. For the event, the shoot, the night out. Members only, and
            membership is free.
          </p>
          <Link href="/signup" className="inline-block bg-black px-6 py-3 text-xs uppercase tracking-widest text-white">
            Join free
          </Link>
        </div>
        <ol className="space-y-3 text-sm">
          {steps.map((s, i) => (
            <li key={s} className="grid grid-cols-[2rem_1fr]">
              <span className="text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <ProductGrid products={products.filter((p) => !hidden.has(p.id))} />
      <NextPage cursor={nextCursor} basePath="/rent" />
    </div>
  );
}
