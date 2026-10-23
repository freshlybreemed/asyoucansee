import { AdminError } from "@/components/admin-error";
import { stripeEnabled } from "@/lib/admin";
import { displayTitle, formatMoney } from "@/lib/catalog-format";
import { createAdminClient } from "@/lib/supabase/server";
import { allowedActions, balanceCents, type RentalAction, type RentalStatus } from "@/lib/rental-status";
import { markPaid, rentalAction } from "./actions";

const COLUMNS: { status: RentalStatus; label: string }[] = [
  { status: "requested", label: "Requests" },
  { status: "confirmed", label: "Confirmed: awaiting pickup" },
  { status: "checked_out", label: "Out now" },
  { status: "late", label: "Late" },
  { status: "returned", label: "Returned" },
];

const ACTION_LABEL: Record<RentalAction, string> = {
  confirm: "Confirm",
  decline: "Decline",
  cancel: "Cancel",
  check_out: "Check out",
  check_in: "Check in",
};

type Row = {
  id: string;
  status: RentalStatus;
  starts_on: string;
  due_on: string;
  quoted_cents: number;
  paid_cents: number;
  late_fee_cents: number;
  late_fees_paid_cents: number;
  payment_method: string | null;
  pieces: { title: string; vendor: string | null; image_url: string | null } | null;
  profiles: { full_name: string; email: string; phone: string | null; social_handle: string | null; tier: string } | null;
};

export default async function AdminRentals({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { data, error: loadError } = await createAdminClient()
    .from("rentals")
    .select(
      "id, status, starts_on, due_on, quoted_cents, paid_cents, late_fee_cents, late_fees_paid_cents, payment_method, " +
        "pieces(title, vendor, image_url), profiles(full_name, email, phone, social_handle, tier)",
    )
    .neq("status", "cancelled")
    .order("starts_on");
  if (loadError) throw new Error(loadError.message);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-8">
      <AdminError error={error} />
      {!stripeEnabled() && (
        <p className="bg-neutral-100 p-3 text-sm">
          Stripe isn&apos;t connected, so collect payment in the showroom and use <strong>Mark paid</strong>. Late fees still
          add up automatically.
        </p>
      )}
      {COLUMNS.map((col) => {
        const list = rows.filter((r) => r.status === col.status);
        if (!list.length && col.status !== "requested") return null;
        return (
          <section key={col.status} className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500">
              {col.label} · {list.length}
            </h2>
            {!list.length && <p className="text-sm text-neutral-400">Nothing waiting.</p>}
            <ul className="divide-y border">
              {list.map((r) => {
                const balance = balanceCents(r);
                return (
                  <li key={r.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                    <div className="flex items-center gap-3">
                      {r.pieces?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${r.pieces.image_url}&width=96`} alt="" className="h-12 w-12 object-contain" />
                      )}
                      <div className="text-sm">
                        <p className="text-[11px] uppercase tracking-widest text-neutral-500">{r.pieces?.vendor}</p>
                        <p>{r.pieces ? displayTitle(r.pieces.title) : "Unknown piece"}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p>
                        {r.profiles?.full_name} <span className="text-neutral-400">· {r.profiles?.tier}</span>
                      </p>
                      <p className="text-neutral-500">
                        {[r.profiles?.phone, r.profiles?.social_handle, r.profiles?.email].filter(Boolean).join(" · ")}
                      </p>
                      <p>
                        {r.starts_on} → {r.due_on} · {formatMoney(r.quoted_cents)}
                        {r.late_fee_cents > 0 && <span className="text-red-600"> + {formatMoney(r.late_fee_cents)} late</span>}
                        {balance > 0 ? (
                          <span className="text-amber-700"> · owes {formatMoney(balance)}</span>
                        ) : (
                          <span className="text-green-700"> · paid{r.payment_method ? ` (${r.payment_method.replace("_", " ")})` : ""}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allowedActions(r.status).map((a) => (
                        <form key={a} action={rentalAction.bind(null, r.id, a)}>
                          <button
                            className={`px-3 py-2 text-xs uppercase tracking-widest ${
                              a === "decline" || a === "cancel" ? "border" : "bg-black text-white"
                            }`}
                          >
                            {ACTION_LABEL[a]}
                          </button>
                        </form>
                      ))}
                      {balance > 0 && (
                        <>
                          <form action={markPaid.bind(null, r.id, "in_person")}>
                            <button className="border px-3 py-2 text-xs uppercase tracking-widest">Mark paid</button>
                          </form>
                          <form action={markPaid.bind(null, r.id, "comp")}>
                            <button className="border px-3 py-2 text-xs uppercase tracking-widest text-neutral-500">Comp</button>
                          </form>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
