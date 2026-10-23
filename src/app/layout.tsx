import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "As You Can See", template: "%s · As You Can See" },
  description: "Archive designer pieces to buy and rent. Rick Owens, Jean Paul Gaultier, Marni, Margiela, Chanel and more.",
};

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/rent", label: "Rent" },
  { href: "/designers", label: "Designers" },
  { href: "/archive", label: "Sold archive" },
  { href: "/sell", label: "Sell with us" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 md:px-6">
            <Link href="/" className="shrink-0 text-sm font-semibold uppercase tracking-[0.25em]">As You Can See</Link>
            <nav className="flex min-w-0 gap-4 overflow-x-auto text-xs uppercase tracking-widest md:gap-6">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap hover:underline">{n.label}</Link>
              ))}
              <Link href="/account" className="whitespace-nowrap hover:underline">Account</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">{children}</main>
        <footer className="mt-24 border-t px-4 py-10 text-center text-xs uppercase tracking-widest text-neutral-500">
          As You Can See · Showroom by appointment
        </footer>
      </body>
    </html>
  );
}
