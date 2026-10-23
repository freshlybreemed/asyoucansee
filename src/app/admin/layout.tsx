import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin", label: "Rentals" },
  { href: "/admin/pieces", label: "Pieces" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/consignments", label: "Consignments" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <nav className="flex gap-6 overflow-x-auto border-b pb-3 text-xs uppercase tracking-widest">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="whitespace-nowrap hover:underline">{t.label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
