import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { getProductsByIds } from "@/lib/shopify/catalog";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rent" };
export const revalidate = 300;

const steps = [
  "Join free and save a card to your account.",
  "Pick a piece and your dates. You'll see the price right away.",
  "We confirm by text or email. Pick up at the showroom.",
  "Return by the due date. Late returns are $30/day.",
];

export default async function RentPage() {
  const { data, error } = await createAdminClient().from("pieces").select("shopify_product_id").eq("is_rentable", true);
  if (error) throw new Error(error.message);
  const products = (await getProductsByIds(data.map((p) => p.shopify_product_id))).filter(
    (p) => p.status === "ACTIVE" && p.totalInventory > 0,
  );

  return (
    <div className="space-y-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold md:text-4xl">Rent the archive</h1>
          <p className="text-neutral-600">
            Runway and archive pieces for the event, the shoot, the night out. Members only, and membership is free.
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
      <ProductGrid products={products} />
    </div>
  );
}
