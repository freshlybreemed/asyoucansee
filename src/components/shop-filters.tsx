import Link from "next/link";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { CATEGORIES, type CategoryKey } from "@/lib/catalog/categories";
import type { Designer } from "@/lib/catalog-format";

export interface ShopFilterValues {
  q?: string;
  category?: CategoryKey;
  designer?: string;
}

/** Search box, designer picker and category chips for product listings. Plain GET form and links, so filters live in the URL. */
export function ShopFilters({ basePath, designers, values }: { basePath: string; designers: Designer[]; values: ShopFilterValues }) {
  const href = (change: Partial<Record<keyof ShopFilterValues, string | null>>) => {
    const merged = { ...values, ...change };
    const qs = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1]));
    return qs.size ? `${basePath}?${qs}` : basePath;
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${active ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"}`;
  const sorted = [...designers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mb-10 space-y-4">
      <form action={basePath} role="search" className="grid gap-2 sm:grid-cols-[1fr_16rem_auto]">
        {values.category && <input type="hidden" name="category" value={values.category} />}
        <input name="q" type="search" defaultValue={values.q} placeholder="Search pieces" aria-label="Search" className="field min-w-0" />
        <AutoSubmitSelect name="designer" defaultValue={values.designer ?? ""} aria-label="Designer" className="field">
          <option value="">All designers</option>
          {sorted.map((d) => (
            <option key={d.key} value={d.key}>{d.name}</option>
          ))}
        </AutoSubmitSelect>
        <button className="btn px-6">Search</button>
      </form>
      <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Link href={href({ category: null })} className={chip(!values.category)}>All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={href({ category: c.key })} className={chip(values.category === c.key)}>
            {c.label}
          </Link>
        ))}
      </nav>
      {(values.q || values.designer) && (
        <p className="text-sm text-smoke">
          {[values.q && `“${values.q}”`, values.designer && designers.find((d) => d.key === values.designer)?.name].filter(Boolean).join(" by ")}
          . <Link href={href({ q: null, designer: null })} className="link text-ink">Clear</Link>
        </p>
      )}
    </div>
  );
}
