import Link from "next/link";
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
    <div className="mx-auto max-w-3xl space-y-12">
      <section className="space-y-2">
        <h1 className="page-title mb-4">{profile.full_name}</h1>
        <p className="text-smoke">{[profile.email, profile.social_handle].filter(Boolean).join(", ")}</p>
        <p className="text-smoke">
          {profile.address_line1}, {profile.city}, {profile.region} {profile.postal_code}
        </p>
      </section>

      <section className="space-y-4 border-t border-ink pt-5">
        <h2 className="display text-2xl">Payment</h2>
        <CardForm hasCard={profile.has_card_on_file} />
      </section>

      <section className="space-y-4 border-t border-ink pt-5">
        <h2 className="display text-2xl">Rentals</h2>
        {!rentals?.length && <p className="text-sm text-smoke">No rentals yet. <Link href="/rent" className="link text-ink">Find something to rent</Link>.</p>}
        <ul className="divide-y divide-ink/10">
          {rentals?.map((r) => {
            const piece = Array.isArray(r.pieces) ? r.pieces[0] : r.pieces;
            return (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span><span className="wide">{piece?.vendor}</span> <span className="text-smoke">{piece?.title}</span></span>
                <span className="text-smoke">
                  {r.starts_on} to {r.due_on}, {r.status.replace("_", " ")}
                  {r.late_fee_cents > 0 && `, late fees $${(r.late_fee_cents / 100).toFixed(2)}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <form action={signOut}>
        <button className="link text-sm">Sign out</button>
      </form>
    </div>
  );
}
