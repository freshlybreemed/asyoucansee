import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Seeing is different than looking. As You Can See is for the discerning eye.",
};

// The owner's brand mantra, in their words. Each chapter is paired with an editorial photo.
const chapters: { title: string; lines: string[]; image?: { src: string; alt: string } }[] = [
  {
    title: "Hidden in plain sight.",
    lines: [
      "Things of real value don't need to announce themselves. They don't need to scream for attention, chase approval, or make themselves available to everyone.",
      "The right things are noticed by the right people. That's intentional.",
      "You don't accidentally find a treasure. You seek it. And once you find your way to us, you'll understand why we were never interested in being everywhere.",
      "We're not for everyone. We never wanted to be. We're here for the discerning eye.",
    ],
    image: { src: "/brand/editorial/subway-back.jpg", alt: "A model in a black strapless top seen from behind on a subway platform" },
  },
  {
    title: "What do you see?",
    lines: [
      "Two people can stand in front of the exact same thing and see something entirely different.",
      "One sees clothing. Another sees history. One sees a price tag. Another understands provenance, construction, cultural significance, and rarity. One sees what's popular. Another sees what's important.",
      "Sometimes the difference is who's looking.",
    ],
    image: { src: "/brand/editorial/grid.jpg", alt: "A model crouched in a mohair sweater and wide leather trousers against a warped grid" },
  },
  {
    title: "See through the noise.",
    lines: [
      "We don't follow the masses because the masses are usually late. Hype is loud. Trends are temporary. Popularity has never been the same thing as quality.",
      "We're interested in the things that hold up after the noise disappears. The overlooked. The misunderstood. The detail everyone else missed.",
      "To see something before everyone else isn't luck. It's foresight. It's education. It's attention.",
    ],
  },
  {
    title: "The less you talk, the more you see.",
    lines: [
      "Observe first. Listen longer. Speak when there's something worth saying.",
      "The less you chase, the more things reveal themselves. Pay attention. Everything is telling you something.",
    ],
    image: { src: "/brand/editorial/trench.jpg", alt: "A model mid-stride in a billowing trench coat and flared trousers" },
  },
  {
    title: "We don't need to sell you anything.",
    lines: [
      "And that's precisely why you'll want to come back. We don't believe luxury should feel like pressure. We're not here to convince you that something is valuable.",
      "If you see it, you see it. If you don't, that's okay too.",
      "Once you find your way to us, you're not treated like another sale. You're treated like someone who found the room for a reason.",
    ],
  },
  {
    title: "Elusive, not distant.",
    lines: [
      "We're difficult to find because not everything should be handed to everyone. But once you find us, you're home.",
      "Elite doesn't have to mean cold. Knowledge doesn't have to mean arrogance. Luxury doesn't have to mean uncomfortable.",
      "As You Can See is exclusive by nature, but personal by design.",
    ],
    image: { src: "/brand/editorial/showroom.jpg", alt: "The As You Can See showroom: racks, a shoe wall, and a low table on a black shag rug" },
  },
  {
    title: "A lifestyle before a brand.",
    lines: [
      "It's not just about what you wear. It's about how you see. How you move. What you notice. What you ignore.",
      "Taste. Discernment. Discipline. Curiosity. Foresight. The ability to separate what's valuable from what's merely visible.",
      "AYCS is for those who don't need to be told what to see. They already see it.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-24 md:space-y-36">
      <section className="-mt-10 mx-[calc(50%-50vw)] bg-oxblood text-paper md:-mt-14">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-32">
          <h1 className="display max-w-5xl text-[13vw] md:text-[7.5rem]">Seeing is different than looking.</h1>
          <div className="mt-12 max-w-xl space-y-5 text-lg text-paper/80 md:ml-[40%]">
            <p>Most people look. Few people see.</p>
            <p>
              We live in a world where everyone is watching something, consuming everything, and paying attention to
              almost nothing. Everyone has access. Very few have discernment.
            </p>
            <p className="text-paper">As You Can See exists for those who still know how to observe.</p>
          </div>
        </div>
      </section>

      {chapters.map((c, i) => (
        <section
          key={c.title}
          className={`grid items-center gap-10 md:gap-16 ${c.image ? "md:grid-cols-2" : "md:grid-cols-[1fr_2fr]"}`}
        >
          {c.image && (
            <div className={`relative aspect-[4/5] overflow-hidden bg-plate ${i % 2 ? "md:order-2" : ""}`}>
              <Image src={c.image.src} alt={c.image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
          {!c.image && <div className="hidden md:block" />}
          <div className="max-w-lg space-y-5">
            <h2 className="display text-4xl md:text-6xl">{c.title}</h2>
            {c.lines.map((l) => (
              <p key={l} className="text-lg leading-relaxed text-smoke">{l}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-8 border-t border-ink pt-10 text-center">
        <p className="display mx-auto max-w-4xl text-4xl md:text-7xl">The answer was always right in front of you.</p>
        <p className="text-lg text-smoke">You just had to know where to look.</p>
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <Link href="/shop" className="btn">Shop the collection</Link>
          <Link href="/signup" className="btn-line">Become a member</Link>
        </div>
      </section>
    </div>
  );
}
