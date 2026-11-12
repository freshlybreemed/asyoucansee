"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/shopify/catalog";

/** Product photos: a swipeable one-at-a-time slideshow on phones, the full grid from `sm` up. */
export function Gallery({ images, title }: { images: CatalogProduct["images"]; title: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  function onScroll() {
    const el = track.current;
    if (el) setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i: number) {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={track}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <div
            key={img.url}
            className={`plate relative aspect-[4/5] w-full shrink-0 snap-center ${i === 0 ? "sm:col-span-2 sm:aspect-square" : ""}`}
          >
            <Image src={img.url} alt={img.altText ?? title} fill priority={i === 0} sizes="(min-width: 768px) 60vw, 100vw" className="object-contain p-[6%]" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-2 sm:hidden">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              aria-current={i === current}
              className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-ink" : "w-1.5 bg-ink/25"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
