import Image from "next/image";
import Link from "next/link";
import { displayTitle, formatMoney, isRentalOnly } from "@/lib/catalog-format";
import type { CatalogProduct } from "@/lib/shopify/catalog";

export function ProductCard({ product, sold = false }: { product: CatalogProduct; sold?: boolean }) {
  const image = product.images[0];
  const rentalOnly = isRentalOnly(product.title, product.priceCents);
  return (
    <Link href={`/shop/${product.handle}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {image && (
          <Image
            src={image.url}
            alt={image.altText ?? product.title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {(sold || rentalOnly) && (
          <span className="absolute left-2 top-2 bg-white px-2 py-0.5 text-[10px] uppercase tracking-widest">
            {sold ? "Sold" : "Rent only"}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5 text-sm">
        <p className="text-[11px] uppercase tracking-widest text-neutral-500">{product.vendor}</p>
        <p className="line-clamp-1">{displayTitle(product.title)}</p>
        {!rentalOnly && (
          <p className={sold ? "text-neutral-400" : ""}>
            {formatMoney(product.priceCents)}
            {product.compareAtCents && (
              <s className="ml-2 text-neutral-400">{formatMoney(product.compareAtCents)}</s>
            )}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, sold }: { products: CatalogProduct[]; sold?: boolean }) {
  if (!products.length) return <p className="text-sm text-neutral-500">Nothing here yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} sold={sold} />
      ))}
    </div>
  );
}

/** "Next page" link that carries the Shopify cursor; back uses the browser. */
export function NextPage({ cursor, basePath }: { cursor: string | null; basePath: string }) {
  if (!cursor) return null;
  return (
    <div className="mt-12 text-center">
      <Link href={`${basePath}?after=${encodeURIComponent(cursor)}`} className="border px-6 py-3 text-sm uppercase tracking-widest">
        More pieces
      </Link>
    </div>
  );
}
