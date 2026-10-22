import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "As You Can See — Showroom Rentals",
  description: "Rent archive pieces from the As You Can See showroom.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <Link href="/" className="text-sm font-semibold uppercase tracking-widest">As You Can See</Link>
          <nav className="flex gap-4 text-sm">
            <a href="https://asyoucansee.com">Shop</a>
            <Link href="/account">Account</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
