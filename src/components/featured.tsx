import Image from "next/image";
import Link from "next/link";
import { displayTitle, formatMoney, isRentalOnly } from "@/lib/catalog-format";
import type { CatalogProduct } from "@/lib/shopify/catalog";

/** Editorial grid: the lead piece spans two columns and two rows; the rest tile beside and below it. */
export function FeaturedGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
      {products.map((p, i) => {
        const image = p.images[0];
        const lead = i === 0;
        return (
          <Link key={p.id} href={`/shop/${p.handle}`} className={`group flex flex-col ${lead ? "col-span-2 md:row-span-2" : ""}`}>
            <div className="relative flex-1 overflow-hidden bg-white">
              <div className={`relative ${lead ? "aspect-square md:aspect-auto md:h-full" : "aspect-[3/4]"}`}>
                {image && (
                  <Image
                    src={image.url}
                    alt={image.altText ?? p.title}
                    fill
                    priority={i < 3}
                    sizes={lead ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                    className="object-contain transition duration-700 group-hover:scale-105"
                  />
                )}
              </div>
            </div>
            <div className="mt-3 space-y-0.5">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">{p.vendor}</p>
              <p className={lead ? "text-xl" : "line-clamp-1 text-sm"}>{displayTitle(p.title)}</p>
              <p className="text-sm">{isRentalOnly(p.title, p.priceCents) ? "Rent only" : formatMoney(p.priceCents)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
