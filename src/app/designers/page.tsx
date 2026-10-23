import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Designers</h1>
      <div className="columns-2 gap-8 md:columns-4">
        {[...byLetter.entries()].map(([letter, list]) => (
          <div key={letter} className="mb-6 break-inside-avoid">
            <p className="mb-2 text-xs text-neutral-400">{letter}</p>
            {list.map((d) => (
              <Link key={d.key} href={`/designers/${d.key}`} className="block py-0.5 text-sm hover:underline">
                {d.name} <span className="text-neutral-400">{d.count}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
