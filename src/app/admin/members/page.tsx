import { AdminError } from "@/components/admin-error";
import { PRICING } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/server";
import { setTier } from "../actions";

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { data, error: loadError } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, email, phone, social_handle, city, tier, has_card_on_file, created_at")
    .order("created_at", { ascending: false });
  if (loadError) throw new Error(loadError.message);

  return (
    <div className="space-y-6">
      <AdminError error={error} />
      <p className="text-sm text-neutral-500">
        Tier sets rental pricing:{" "}
        {Object.entries(PRICING.relationship)
          .map(([t, m]) => `${t} ${m === 1 ? "full price" : m === 0 ? "free" : `${Math.round((1 - m) * 100)}% off`}`)
          .join(" · ")}
      </p>
      <ul className="divide-y border">
        {data?.map((m) => (
          <li key={m.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p>{m.full_name}</p>
              <p className="text-neutral-500">
                {[m.email, m.phone, m.social_handle, m.city].filter(Boolean).join(" · ")}
                {m.has_card_on_file ? " · card on file" : ""}
              </p>
            </div>
            <form action={setTier.bind(null, m.id)} className="flex gap-2">
              <select name="tier" defaultValue={m.tier} className="border px-2 py-1.5">
                {Object.keys(PRICING.relationship).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button className="border px-3 py-1.5 text-xs uppercase">Save</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
