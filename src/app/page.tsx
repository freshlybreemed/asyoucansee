import Link from "next/link";
import { FeaturedGrid } from "@/components/featured";
import { ProductGrid } from "@/components/product-card";
import { listDesigners } from "@/lib/catalog/designers";
import { listFeatured } from "@/lib/catalog/featured";
import { listProducts } from "@/lib/shopify/catalog";

export const revalidate = 300;

const SIGNATURE = ["rickowens", "jeanpaulgaultier", "marni", "maisonmargiela", "chanel", "justcavalli"];

export default async function Home() {
  const [featured, { products: arrivals }, designers] = await Promise.all([
    listFeatured(),
    listProducts({ first: 8 }),
    listDesigners(),
  ]);
  const signature = SIGNATURE.flatMap((k) => designers.find((d) => d.key === k) ?? []);

  return (
    <div className="space-y-20">
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold md:text-5xl">The collection</h1>
            <p className="mt-2 max-w-xl text-neutral-600">
              Archive and runway pieces, authenticated by us. Buy it, rent it, or see it in the showroom.
            </p>
          </div>
          <Link href="/shop" className="bg-black px-6 py-3 text-xs uppercase tracking-widest text-white">Shop all</Link>
        </div>
        <FeaturedGrid products={featured.products} />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold">New arrivals</h2>
          <Link href="/shop" className="text-xs uppercase tracking-widest underline">Shop new arrivals</Link>
        </div>
        <ProductGrid products={arrivals} />
      </section>

      <section className="space-y-6">
        <h2 className="text-xs uppercase tracking-widest text-neutral-500">Signature designers</h2>
        <div className="grid grid-cols-2 gap-px bg-neutral-200 md:grid-cols-3">
          {signature.map((d) => (
            <Link key={d.key} href={`/designers/${d.key}`} className="bg-white p-6 hover:bg-neutral-50">
              <p className="text-lg">{d.name}</p>
              <p className="text-xs text-neutral-500">{d.count} pieces</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-px bg-neutral-200 md:grid-cols-3">
        {[
          { title: "Buy", body: "Every piece is inspected and authenticated before it's listed.", href: "/shop", cta: "Shop" },
          { title: "Rent", body: "Wear the archive for an event or a shoot. Free membership, card on file, pick your dates.", href: "/rent", cta: "See what's rentable" },
          { title: "Sell", body: "Consign your closet. We authenticate, photograph, price and sell. You get paid.", href: "/sell", cta: "Start consigning" },
        ].map((c) => (
          <div key={c.title} className="space-y-3 bg-white p-8">
            <h3 className="text-2xl">{c.title}</h3>
            <p className="text-sm text-neutral-600">{c.body}</p>
            <Link href={c.href} className="inline-block text-xs uppercase tracking-widest underline">{c.cta}</Link>
          </div>
        ))}
      </section>
    </div>
  );
}
