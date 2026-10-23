import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { listDesigners } from "@/lib/catalog/designers";
import { listFeatured } from "@/lib/catalog/featured";
import { listProducts } from "@/lib/shopify/catalog";

export const revalidate = 300;

const SIGNATURE = ["rickowens", "jeanpaulgaultier", "marni", "maisonmargiela", "chanel", "justcavalli"];

const ways = [
  { title: "Buy", body: "Shop the curation from your phone, or book a private appointment at the showroom.", href: "/shop", cta: "Shop the collection" },
  { title: "Rent", body: "Red carpets, music videos, the party, and the after party. Priced for your dates and your plans.", href: "/rent", cta: "Rent a piece" },
  { title: "Sell", body: "Keep 80% of the sale. Drop off your pieces and we handle pricing and marketing while you get paid.", href: "/sell", cta: "Start consigning" },
];

// From the AYCS press kit.
const reviews = [
  "The best consignment store on the planet. The curation is crazy.",
  "AYCS has been one of the sole pillars of my fashion game since 2019 and even sourced pieces that I had been searching the globe for.",
  "I love purchasing through AYCS. Prices are reasonable, pieces are quality, and they've greatly allowed me to expand my closet and offer different looks to my clients.",
  "I do have trouble finding pieces at luxury consignments in my size, but they always have something new for me.",
];

const editorial = [
  { src: "/brand/editorial/platform.jpg", alt: "A model in a black strapless top and trousers on a subway platform" },
  { src: "/brand/editorial/olive.jpg", alt: "A model in an olive cropped blazer over a printed mesh top" },
  { src: "/brand/editorial/crosswalk.jpg", alt: "A model crossing the street in a black cutout blazer dress" },
];

export default async function Home() {
  const [featured, { products: arrivals }, designers] = await Promise.all([
    listFeatured(),
    listProducts({ first: 8 }),
    listDesigners(),
  ]);
  const signature = SIGNATURE.flatMap((k) => designers.find((d) => d.key === k) ?? []);

  return (
    <div className="space-y-24 md:space-y-32">
      {/* Full-bleed hero: the brand film from the original site. Reduced-motion visitors get the still. */}
      <section className="relative -mt-10 mx-[calc(50%-50vw)] overflow-hidden bg-ink bg-[url(/brand/subway-poster.jpg)] bg-cover bg-center text-paper md:-mt-14">
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
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-ink/10 md:bg-gradient-to-r md:from-ink/70 md:via-ink/25 md:to-transparent" />
        <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl flex-col justify-end gap-8 px-4 pb-12 pt-32 md:px-8 md:pb-20">
          <h1 className="display text-[19vw] md:text-[9vw] xl:text-[9.5rem]">As you can see.</h1>
          <p className="max-w-md text-lg text-paper/85">
            Archive and runway pieces for the discerning eye. Buy, rent, sell, or try them on in the showroom.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop" className="btn-paper">Shop the collection</Link>
            <Link href="/rent" className="btn-ghost">Rent a piece</Link>
          </div>
        </div>
      </section>

      {featured.products.length > 0 && (
        <section className="space-y-8">
          <SectionHead title="Selected pieces" href="/shop" cta="Shop all" />
          <ProductGrid products={featured.products.slice(0, 8)} />
        </section>
      )}

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

      <section className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div className="space-y-6 md:sticky md:top-28 md:self-start">
          <h2 className="display text-5xl md:text-7xl">Most people look. Few people see.</h2>
          <p className="max-w-sm text-lg text-smoke">
            One sees clothing. Another sees history. One sees a price tag. Another understands provenance, construction,
            and rarity.
          </p>
          <Link href="/about" className="link inline-block font-medium">What do you see?</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          {editorial.map((img, i) => (
            <div key={img.src} className={`relative overflow-hidden bg-plate ${i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-[3/4]"}`}>
              <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 35vw, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <h2 className="display text-3xl md:text-4xl">From clients</h2>
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {reviews.map((r, i) => (
            <blockquote key={r} className={`border-l-2 border-rose pl-5 ${i === 0 ? "wide text-2xl md:col-span-2 md:text-4xl" : "text-lg text-smoke"}`}>
              {r}
            </blockquote>
          ))}
        </div>
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
