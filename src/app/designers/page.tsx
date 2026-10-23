import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/product-card";
import { listDesigners } from "@/lib/catalog/designers";

export const metadata: Metadata = { title: "Designers" };
export const revalidate = 300;

export default async function DesignersPage() {
  const designers = await listDesigners();
  const byLetter = new Map<string, typeof designers>();
  for (const d of [...designers].sort((a, b) => a.name.localeCompare(b.name))) {
    const letter = /[a-z]/i.test(d.name[0]) ? d.name[0].toUpperCase() : "#";
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), d]);
  }
  return (
    <div>
      <PageHeader title="Designers" />
      <div className="columns-2 gap-10 md:columns-4">
        {[...byLetter.entries()].map(([letter, list]) => (
          <div key={letter} className="mb-8 break-inside-avoid">
            <p className="display mb-3 text-3xl text-oxblood">{letter}</p>
            {list.map((d) => (
              <Link key={d.key} href={`/designers/${d.key}`} className="block py-1 text-sm hover:text-oxblood">
                {d.name} <span className="text-smoke">{d.count}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
