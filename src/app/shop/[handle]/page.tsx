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
    <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
      <div className="grid gap-2 sm:grid-cols-2">
        {product.images.map((img, i) => (
          <div key={img.url} className={`relative aspect-square bg-neutral-100 ${i === 0 ? "sm:col-span-2" : ""}`}>
            <Image src={img.url} alt={img.altText ?? product.title} fill priority={i === 0} sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" />
          </div>
        ))}
      </div>

      <div className="space-y-6 md:sticky md:top-24 md:self-start">
        <div className="space-y-1">
          <Link href={`/designers/${designerKey(product.vendor)}`} className="text-xs uppercase tracking-widest text-neutral-500 hover:underline">
            {product.vendor}
          </Link>
          <h1 className="text-2xl">{displayTitle(product.title)}</h1>
          {!rentalOnly && (
            <p className="text-lg">
              {formatMoney(product.priceCents)}
              {product.compareAtCents && <s className="ml-2 text-neutral-400">{formatMoney(product.compareAtCents)}</s>}
            </p>
          )}
        </div>

        {sold ? (
          <p className="border p-4 text-sm">Sold. Want something like it? <Link href="/sell" className="underline">Get in touch</Link> and we&apos;ll source it.</p>
        ) : (
          !rentalOnly && (
            <a href={buyNowUrl(env("SHOPIFY_STORE_DOMAIN"), product.variantId)} className="block bg-black py-4 text-center text-xs uppercase tracking-widest text-white">
              Buy now
            </a>
          )
        )}

        {rentable && <RentForm productId={product.id} signedIn={!!auth.user} />}

        {product.descriptionHtml && (
          <div className="prose prose-sm text-sm text-neutral-700" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
        )}

        <ul className="space-y-1 border-t pt-4 text-xs text-neutral-500">
          <li>Authenticated by As You Can See</li>
          <li>Try it on in the showroom by appointment</li>
        </ul>
      </div>
    </div>
  );
}
