import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { CardForm } from "./card-form";

export default async function AccountPage() {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: profile }, { data: rentals }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single(),
    supabase
      .from("rentals")
      .select("id, status, starts_on, due_on, quoted_cents, late_fee_cents, pieces(title, vendor)")
      .order("starts_on", { ascending: false }),
  ]);
  if (!profile) redirect("/signup");

  return (
    <div className="space-y-10">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
        <p className="text-sm text-neutral-600">{profile.email} · {profile.social_handle ?? "no social"}</p>
        <p className="text-sm text-neutral-600">
          {profile.address_line1}, {profile.city}, {profile.region} {profile.postal_code}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Payment</h2>
        <CardForm hasCard={profile.has_card_on_file} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Rentals</h2>
        {!rentals?.length && <p className="text-sm text-neutral-600">No rentals yet.</p>}
        <ul className="divide-y">
          {rentals?.map((r) => {
            const piece = Array.isArray(r.pieces) ? r.pieces[0] : r.pieces;
            return (
              <li key={r.id} className="flex justify-between py-2 text-sm">
                <span>{piece?.vendor} — {piece?.title}</span>
                <span>
                  {r.starts_on} → {r.due_on} · {r.status}
                  {r.late_fee_cents > 0 && ` · late fees $${(r.late_fee_cents / 100).toFixed(2)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <form action={signOut}>
        <button className="text-sm underline">Sign out</button>
      </form>
    </div>
  );
}
