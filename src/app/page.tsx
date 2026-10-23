import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { displayTitle, formatMoney, isRentalOnly } from "@/lib/catalog-format";
import { listDesigners } from "@/lib/catalog/designers";
import { listFeatured } from "@/lib/catalog/featured";
import { listProducts } from "@/lib/shopify/catalog";

export const revalidate = 300;

const SIGNATURE = ["rickowens", "jeanpaulgaultier", "marni", "maisonmargiela", "chanel", "justcavalli"];

const ways = [
  { title: "Buy", body: "Every piece is inspected and authenticated before it's listed.", href: "/shop", cta: "Shop the collection" },
  { title: "Rent", body: "Wear the archive for an event or a shoot. Join free, pick your dates, pick up at the showroom.", href: "/rent", cta: "Rent a piece" },
  { title: "Sell", body: "Consign your closet. We authenticate, photograph, price, and sell. You get paid.", href: "/sell", cta: "Start consigning" },
];

export default async function Home() {
  const [featured, { products: arrivals }, designers] = await Promise.all([
    listFeatured(),
    listProducts({ first: 8 }),
    listDesigners(),
  ]);
  const [lead, ...selected] = featured.products;
  const leadImage = lead?.images[0];
  const signature = SIGNATURE.flatMap((k) => designers.find((d) => d.key === k) ?? []);

  return (
    <div className="space-y-24 md:space-y-32">
      {/* Full-bleed hero: the name says it, the lead piece shows it. */}
      <section className="-mt-10 mx-[calc(50%-50vw)] bg-oxblood text-paper md:-mt-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:items-end md:gap-12 md:px-8 md:py-20">
          <div className="space-y-8">
            <h1 className="display text-[19vw] md:text-[8.5vw] xl:text-[8.25rem]">As you can see.</h1>
            <p className="max-w-md text-lg text-paper/80">
              Archive and runway pieces, authenticated by us. Buy them, rent them, or try them on in the showroom.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop" className="btn-paper">Shop the collection</Link>
              <Link href="/rent" className="btn-ghost">Rent a piece</Link>
            </div>
          </div>
          {lead && (
            <Link href={`/shop/${lead.handle}`} className="group block">
              <div className="plate aspect-[4/5]">
                {leadImage && (
                  <Image
                    src={leadImage.url}
                    alt={leadImage.altText ?? lead.title}
                    fill
                    priority
                    sizes="(min-width: 768px) 45vw, 100vw"
                    className="object-contain p-[7%] transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="wide text-lg">{lead.vendor}</p>
                  <p className="text-paper/70">{displayTitle(lead.title)}</p>
                </div>
                <p className="shrink-0 text-lg tabular-nums">
                  {isRentalOnly(lead.title, lead.priceCents) ? "Rent only" : formatMoney(lead.priceCents)}
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {selected.length > 0 && (
        <section className="space-y-8">
          <SectionHead title="Selected pieces" href="/shop" cta="Shop all" />
          <ProductGrid products={selected} />
        </section>
      )}

      {/* Brand film from the original site. Reduced-motion visitors get the still. */}
      <section className="relative mx-[calc(50%-50vw)] overflow-hidden bg-ink bg-[url(/brand/subway-poster.jpg)] bg-cover bg-center text-paper">
        <video
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          src="/brand/subway.mp4"
          poster="/brand/subway-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent" />
        <div className="relative mx-auto flex aspect-[4/5] max-h-[85vh] max-w-7xl flex-col justify-end gap-6 px-4 py-12 sm:aspect-video md:aspect-[21/9] md:px-8 md:py-16">
          <h2 className="display max-w-2xl text-5xl md:text-7xl">Wear the archive.</h2>
          <p className="max-w-md text-lg text-paper/85">
            Every piece in the collection can be rented. Join free, pick your dates, and pick it up at the showroom.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/rent" className="btn-paper">Rent a piece</Link>
            <Link href="/signup" className="btn-ghost">Become a member</Link>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <SectionHead title="Just in" href="/shop" cta="Shop new arrivals" />
        <ProductGrid products={arrivals} />
      </section>

      <section className="space-y-8">
        <SectionHead title="Designers we know best" href="/designers" cta="All designers" />
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {signature.map((d) => (
            <li key={d.key}>
              <Link href={`/designers/${d.key}`} className="wide group text-3xl md:text-5xl">
                <span className="decoration-oxblood decoration-2 underline-offset-8 group-hover:underline">{d.name}</span>
                <sup className="ml-1 align-super text-sm font-normal text-smoke">{d.count}</sup>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-10 md:grid-cols-3 md:gap-8">
        {ways.map((w) => (
          <div key={w.title} className="space-y-3 border-t border-ink pt-5">
            <h2 className="display text-4xl">{w.title}</h2>
            <p className="max-w-xs text-smoke">{w.body}</p>
            <Link href={w.href} className="link inline-block text-sm font-medium">{w.cta}</Link>
          </div>
        ))}
      </section>
    </div>
  );
}

function SectionHead({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="display text-3xl md:text-4xl">{title}</h2>
      <Link href={href} className="link shrink-0 text-sm font-medium">{cta}</Link>
    </div>
  );
}
