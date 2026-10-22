import Link from "next/link";
export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Showroom rentals</h1>
      <p className="text-neutral-600">
        Wear the archive. Create a member profile, save a card, and request pieces from the showroom.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="rounded bg-black px-4 py-2 text-white">Become a member</Link>
        <Link href="/login" className="rounded border px-4 py-2">Sign in</Link>
      </div>
    </section>
  );
}
