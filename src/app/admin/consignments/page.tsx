import { AdminError } from "@/components/admin-error";
import { createAdminClient } from "@/lib/supabase/server";
import { setConsignmentStatus } from "../actions";

const STATUSES = ["new", "reviewing", "accepted", "declined", "received", "listed", "paid_out"];

export default async function AdminConsignments({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { data, error: loadError } = await createAdminClient()
    .from("consignments")
    .select("*")
    .order("created_at", { ascending: false });
  if (loadError) throw new Error(loadError.message);

  return (
    <div className="space-y-6">
      <AdminError error={error} />
      {!data?.length && <p className="text-sm text-neutral-500">No submissions yet.</p>}
      <ul className="divide-y border">
        {data?.map((c) => (
          <li key={c.id} className="grid gap-4 p-4 text-sm md:grid-cols-[1fr_18rem]">
            <div className="space-y-1">
              <p className="font-medium">
                {c.full_name} <span className="font-normal text-neutral-400">· {new Date(c.created_at).toLocaleDateString()}</span>
              </p>
              <p className="text-neutral-500">{[c.email, c.phone, c.social_handle, c.city].filter(Boolean).join(" · ")}</p>
              <p><span className="text-neutral-500">Designers:</span> {c.designers}</p>
              <p className="whitespace-pre-wrap">{c.items}</p>
              {c.estimated_value && <p><span className="text-neutral-500">Est. value:</span> {c.estimated_value}</p>}
              {c.photos_url && (
                <a href={c.photos_url} target="_blank" rel="noreferrer" className="underline">Photos</a>
              )}
            </div>
            <form action={setConsignmentStatus.bind(null, c.id)} className="space-y-2">
              <select name="status" defaultValue={c.status} className="w-full border px-2 py-1.5">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <textarea name="notes" defaultValue={c.internal_notes ?? ""} rows={3} placeholder="Internal notes" className="w-full border px-2 py-1.5" />
              <button className="w-full bg-black py-2 text-xs uppercase tracking-widest text-white">Save</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
