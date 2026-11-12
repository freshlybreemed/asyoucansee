import { AdminError } from "@/components/admin-error";
import Link from "next/link";
import { SaveButton } from "@/components/save-button";
import { CATEGORIES, isCategoryKey } from "@/lib/catalog/categories";
import { stripeEnabled } from "@/lib/admin";
import { displayTitle, formatMoney } from "@/lib/catalog-format";
import { createAdminClient } from "@/lib/supabase/server";
import { allowedActions, balanceCents, rateSettled, type RentalAction, type RentalStatus } from "@/lib/rental-status";
import { markPaid, rentalAction, setQuote } from "./actions";

const COLUMNS: { status: RentalStatus; label: string }[] = [
  { status: "requested", label: "Requests: reach out and set a price" },
  { status: "quoted", label: "Quoted: waiting on payment" },
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
  quoted_cents: number | null;
  occasion: string | null;
  budget_cents: number | null;
  quote_breakdown: { totalCents: number } | null;
  paid_cents: number;
  late_fee_cents: number;
  late_fees_paid_cents: number;
  payment_method: string | null;
  pieces: { title: string; vendor: string | null; image_url: string | null; category: string | null } | null;
  profiles: { full_name: string; email: string; phone: string | null; social_handle: string | null; tier: string } | null;
};

type Filters = { q?: string; designer?: string; category?: string; status?: string; error?: string };

export default async function AdminRentals({ searchParams }: { searchParams: Promise<Filters> }) {
  const { error, q = "", designer = "", category = "", status = "" } = await searchParams;
  const { data, error: loadError } = await createAdminClient()
    .from("rentals")
    .select(
      "id, status, starts_on, due_on, quoted_cents, occasion, budget_cents, quote_breakdown, paid_cents, late_fee_cents, late_fees_paid_cents, payment_method, " +
        "pieces(title, vendor, image_url, category), profiles(full_name, email, phone, social_handle, tier)",
    )
    .neq("status", "cancelled")
    .order("starts_on");
  if (loadError) throw new Error(loadError.message);
  const all = (data ?? []) as unknown as Row[];
  const designers = [...new Set(all.map((r) => r.pieces?.vendor).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
  const needle = q.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (!designer || r.pieces?.vendor === designer) &&
      (!isCategoryKey(category) || r.pieces?.category === category) &&
      (!needle || [r.profiles?.full_name, r.profiles?.email, r.pieces?.title].some((v) => v?.toLowerCase().includes(needle))),
  );
  const filtering = Boolean(q || designer || category || status);

  return (
    <div className="space-y-8">
      <AdminError error={error} />
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Member or piece" className="min-w-0 flex-1 border px-3 py-2 text-sm" />
        <select name="designer" defaultValue={designer} aria-label="Designer" className="border px-2 py-2 text-sm">
          <option value="">All designers</option>
          {designers.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select name="category" defaultValue={category} aria-label="Category" className="border px-2 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} aria-label="Status" className="border px-2 py-2 text-sm">
          <option value="">All statuses</option>
          {COLUMNS.map((c) => (
            <option key={c.status} value={c.status}>{c.label.split(":")[0]}</option>
          ))}
        </select>
        <button className="bg-black px-4 py-2 text-xs uppercase tracking-widest text-white">Filter</button>
        {filtering && <Link href="/admin" className="self-center text-sm underline">Clear</Link>}
      </form>
      {!stripeEnabled() && (
        <p className="bg-neutral-100 p-3 text-sm">
          Stripe isn&apos;t connected, so collect payment in the showroom and use <strong>Mark paid</strong>. Late fees still
          add up automatically.
        </p>
      )}
      {COLUMNS.map((col) => {
        if (status && col.status !== status) return null;
        const list = rows.filter((r) => r.status === col.status);
        if (!list.length && (filtering || col.status !== "requested")) return null;
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
                  <li key={r.id} id={`rental-${r.id}`} className="scroll-mt-24 grid gap-3 p-4 target:bg-rose/20 md:grid-cols-[1fr_1fr_auto] md:items-center">
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
                        {r.starts_on} → {r.due_on}
                        {r.quoted_cents != null && <> · {formatMoney(r.quoted_cents)}</>}
                        {r.late_fee_cents > 0 && <span className="text-red-600"> + {formatMoney(r.late_fee_cents)} late</span>}
                        {r.quoted_cents == null ? null : balance > 0 ? (
                          <span className="text-amber-700"> · owes {formatMoney(balance)}</span>
                        ) : (
                          <span className="text-green-700"> · paid{r.payment_method ? ` (${r.payment_method.replace("_", " ")})` : ""}</span>
                        )}
                      </p>
                      {(r.status === "requested" || r.status === "quoted") && (
                        <p className="text-neutral-500">
                          {r.occasion && <>For: {r.occasion} · </>}
                          Budget {r.budget_cents != null ? formatMoney(r.budget_cents) : "not given"} · Suggested{" "}
                          {r.quote_breakdown ? formatMoney(r.quote_breakdown.totalCents) : "n/a"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(r.status === "requested" || r.status === "quoted") && (
                        <form key={r.quoted_cents ?? "new"} action={setQuote.bind(null, r.id)} className="flex gap-2">
                          <input
                            name="quote"
                            inputMode="decimal"
                            required
                            placeholder="$"
                            defaultValue={r.quoted_cents != null ? r.quoted_cents / 100 : (r.quote_breakdown?.totalCents ?? 0) / 100 || ""}
                            className="w-24 border px-2 py-2 text-sm"
                          />
                          <SaveButton className="bg-black px-3 py-2 text-xs uppercase tracking-widest text-white">
                            {r.status === "quoted" ? "Update quote" : "Send quote"}
                          </SaveButton>
                        </form>
                      )}
                      {r.status === "quoted" && !rateSettled(r) && (
                        <span className="self-center text-xs text-neutral-500">Waiting on member to pay</span>
                      )}
                      {allowedActions(r.status)
                        .filter((a) => a !== "confirm" || rateSettled(r))
                        .map((a) => (
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
