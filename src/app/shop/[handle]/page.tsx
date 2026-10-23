import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buyNowUrl, designerKey, displayTitle, formatMoney, isRentalOnly } from "@/lib/catalog-format";
import { env } from "@/lib/env";
import { getProduct } from "@/lib/shopify/catalog";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { RentForm } from "./rent-form";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const product = await getProduct((await params).handle);
  return { title: product ? `${product.vendor} ${displayTitle(product.title)}` : "Piece" };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const product = await getProduct((await params).handle);
  if (!product || product.status === "DRAFT") notFound();

  const supabase = await createUserClient();
  const [{ data: auth }, { data: piece }] = await Promise.all([
    supabase.auth.getUser(),
    createAdminClient().from("pieces").select("is_rentable").eq("shopify_product_id", product.id).maybeSingle(),
  ]);

  const sold = product.status === "ARCHIVED" || product.totalInventory < 1;
  const rentalOnly = isRentalOnly(product.title, product.priceCents);
  const rentable = !sold && !!piece?.is_rentable;

  return (
    <div className="grid gap-10 md:grid-cols-[3fr_2fr] md:gap-14">
      <div className="grid gap-2 sm:grid-cols-2">
        {product.images.map((img, i) => (
          <div key={img.url} className={`plate aspect-[4/5] ${i === 0 ? "sm:col-span-2 sm:aspect-square" : ""}`}>
            <Image src={img.url} alt={img.altText ?? product.title} fill priority={i === 0} sizes="(min-width: 768px) 60vw, 100vw" className="object-contain p-[6%]" />
          </div>
        ))}
      </div>

      <div className="space-y-6 md:sticky md:top-24 md:self-start">
        <div className="space-y-3">
          <Link href={`/designers/${designerKey(product.vendor)}`} className="wide text-lg hover:text-oxblood">
            {product.vendor}
          </Link>
          <h1 className="display text-3xl md:text-4xl">{displayTitle(product.title)}</h1>
          {!rentalOnly && (
            <p className="text-xl tabular-nums">
              {formatMoney(product.priceCents)}
              {product.compareAtCents && <s className="ml-2 text-smoke">{formatMoney(product.compareAtCents)}</s>}
            </p>
          )}
        </div>

        {sold ? (
          <p className="rounded-lg bg-plate p-4 text-sm">Sold. Want something like it? <Link href="/sell" className="link">Get in touch</Link> and we&apos;ll source it.</p>
        ) : (
          !rentalOnly && (
            <a href={buyNowUrl(env("SHOPIFY_STORE_DOMAIN"), product.variantId)} className="btn w-full py-4">
              Buy now
            </a>
          )
        )}

        {rentable && <RentForm productId={product.id} signedIn={!!auth.user} />}

        {product.descriptionHtml && (
          <div className="space-y-2 text-sm leading-relaxed text-smoke" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
        )}

        <ul className="space-y-1 border-t border-ink/15 pt-4 text-sm text-smoke">
          <li>Authenticated by As You Can See</li>
          <li>Try it on at the showroom, open 24 hours</li>
        </ul>
      </div>
    </div>
  );
}
