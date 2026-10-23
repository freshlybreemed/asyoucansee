import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "As You Can See", template: "%s · As You Can See" },
  description: "Archive designer pieces to buy and rent. Rick Owens, Jean Paul Gaultier, Marni, Margiela, Chanel and more.",
  // Preview builds stay out of search so they don't compete with the live asyoucansee.com.
  robots: process.env.ALLOW_INDEXING === "true" ? undefined : { index: false, follow: false },
};

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/rent", label: "Rent" },
  { href: "/designers", label: "Designers" },
  { href: "/archive", label: "Sold archive" },
  { href: "/sell", label: "Sell with us" },
  { href: "/about", label: "About" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 md:px-8">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image src="/brand/monogram.png" alt="" width={34} height={34} priority />
              <span className="display hidden text-lg sm:inline md:text-xl">As You Can See</span>
              <span className="sr-only sm:hidden">As You Can See</span>
            </Link>
            <nav className="flex min-w-0 gap-5 overflow-x-auto text-sm md:gap-7">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap text-smoke transition-colors hover:text-ink">{n.label}</Link>
              ))}
              <Link href="/account" className="whitespace-nowrap font-medium">Account</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-8 md:py-14">{children}</main>
        <footer className="mt-24 bg-oxblood text-paper">
          <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 md:px-8">
            <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
              <div className="space-y-3">
                <Image src="/brand/monogram.png" alt="" width={56} height={56} className="mb-6" />
                <p className="wide text-lg">Seeing is different than looking.</p>
                <p className="max-w-sm text-sm text-paper/70">
                  The 24-hour showroom. Los Angeles and South Florida. Try pieces on, pick up rentals, or bring in your
                  closet.
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {nav.map((n) => (
                  <li key={n.href}><Link href={n.href} className="text-paper/80 hover:text-paper">{n.label}</Link></li>
                ))}
              </ul>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="text-paper/80 hover:text-paper">Become a member</Link></li>
                <li><Link href="/account" className="text-paper/80 hover:text-paper">Your account</Link></li>
              </ul>
            </div>
            <p className="display mt-16 whitespace-nowrap text-[9.4vw] leading-[0.8] text-paper/95 xl:text-[7.4rem]" aria-hidden>
              As You Can See
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
