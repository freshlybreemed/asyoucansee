import Image from "next/image";
import Link from "next/link";
import { displayTitle, formatMoney, isRentalOnly } from "@/lib/catalog-format";
import type { CatalogProduct } from "@/lib/shopify/catalog";

export function ProductCard({ product, sold = false }: { product: CatalogProduct; sold?: boolean }) {
  const [image, alt] = product.images;
  const rentalOnly = isRentalOnly(product.title, product.priceCents);
  return (
    <Link href={`/shop/${product.handle}`} className="group block">
      <div className="plate aspect-[4/5]">
        {image && (
          <Image
            src={image.url}
            alt={image.altText ?? product.title}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className={`object-contain p-[8%] transition-opacity duration-300 ${alt ? "group-hover:opacity-0" : ""} ${sold ? "opacity-60" : ""}`}
          />
        )}
        {/* Second photo on hover: usually the back or a detail. */}
        {alt && (
          <Image
            src={alt.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-contain p-[8%] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        {(sold || rentalOnly) && (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-paper">
            {sold ? "Sold" : "Rent only"}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="wide truncate">{product.vendor}</p>
          <p className="truncate text-smoke">{displayTitle(product.title)}</p>
        </div>
        {!rentalOnly && (
          <p className={`shrink-0 tabular-nums ${sold ? "text-smoke line-through" : ""}`}>
            {formatMoney(product.priceCents)}
          </p>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, sold }: { products: CatalogProduct[]; sold?: boolean }) {
  if (!products.length) return <p className="text-sm text-smoke">Nothing here right now. New pieces land every week.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
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
    <div className="mt-14 text-center">
      <Link href={`${basePath}?after=${encodeURIComponent(cursor)}`} className="btn-line">
        More pieces
      </Link>
    </div>
  );
}

/** Page heading with optional intro copy. */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 space-y-4 md:mb-14">
      <h1 className="page-title">{title}</h1>
      {children && <div className="max-w-xl text-smoke">{children}</div>}
    </div>
  );
}
