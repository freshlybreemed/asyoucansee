import Link from "next/link";
import { AdminError } from "@/components/admin-error";
import { displayTitle, formatMoney, isRentalOnly } from "@/lib/catalog-format";
import { dailyRateCents } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/server";
import { setDailyRate, setRentable } from "../actions";

const PAGE = 50;

export default async function AdminPieces({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rentable?: string; page?: string; error?: string }>;
}) {
  const { q = "", rentable, page = "0", error } = await searchParams;
  const from = Number(page) * PAGE;
  let query = createAdminClient()
    .from("pieces")
    .select("id, title, vendor, image_url, retail_price_cents, daily_rate_cents, is_rentable", { count: "exact" })
    .order("is_rentable", { ascending: false })
    .order("retail_price_cents", { ascending: false })
    .range(from, from + PAGE - 1);
  if (q) query = query.or(`title.ilike.%${q.replace(/[%,()]/g, "")}%,vendor.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (rentable === "1") query = query.eq("is_rentable", true);
  const { data, count, error: loadError } = await query;
  if (loadError) throw new Error(loadError.message);

  const qs = (p: number) => `?${new URLSearchParams({ q, ...(rentable ? { rentable } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <AdminError error={error} />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search title or designer" className="min-w-0 flex-1 border px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rentable" value="1" defaultChecked={rentable === "1"} /> Rentable only
        </label>
        <button className="bg-black px-4 py-2 text-xs uppercase tracking-widest text-white">Search</button>
      </form>
      <p className="text-sm text-neutral-500">
        {count ?? 0} pieces. Leave the daily rate blank to use 8% of retail.
      </p>
      <ul className="divide-y border">
        {data?.map((p) => {
          let derived: string;
          try {
            derived = formatMoney(dailyRateCents(p.retail_price_cents));
          } catch {
            derived = "needs a rate";
          }
          return (
            <li key={p.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div className="flex items-center gap-3 text-sm">
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${p.image_url}&width=96`} alt="" className="h-12 w-12 object-contain" />
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-neutral-500">{p.vendor}</p>
                  <p>{displayTitle(p.title)}</p>
                  <p className="text-neutral-500">
                    {isRentalOnly(p.title, p.retail_price_cents) ? "Rent only" : formatMoney(p.retail_price_cents)}
                  </p>
                </div>
              </div>
              <form action={setDailyRate.bind(null, p.id)} className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">$/day</span>
                <input
                  name="dailyRate"
                  inputMode="decimal"
                  defaultValue={p.daily_rate_cents != null ? p.daily_rate_cents / 100 : ""}
                  placeholder={derived}
                  className="w-28 border px-2 py-1.5"
                />
                <button className="border px-2 py-1.5 text-xs uppercase">Save</button>
              </form>
              <form action={setRentable.bind(null, p.id, !p.is_rentable)}>
                <button
                  className={`w-32 px-3 py-2 text-xs uppercase tracking-widest ${p.is_rentable ? "bg-black text-white" : "border"}`}
                >
                  {p.is_rentable ? "Rentable ✓" : "Make rentable"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-between text-sm">
        {Number(page) > 0 ? <Link href={qs(Number(page) - 1)} className="underline">← Previous</Link> : <span />}
        {from + PAGE < (count ?? 0) && <Link href={qs(Number(page) + 1)} className="underline">Next →</Link>}
      </div>
    </div>
  );
}
