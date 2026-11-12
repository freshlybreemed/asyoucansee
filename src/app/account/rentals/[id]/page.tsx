import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatMoney } from "@/lib/catalog-format";
import { formatDay, rentalRef } from "@/lib/email/templates";
import { createUserClient } from "@/lib/supabase/server";
import { PayButton } from "../../pay-button";

export const metadata = { title: "Your rental" };

const STATUS: Record<string, { label: string; detail: string }> = {
  requested: { label: "Requested", detail: "We're reviewing your dates and will send your rate shortly. Nothing is charged until you pay." },
  quoted: { label: "Rate ready", detail: "Pay to lock in your dates. The piece is held for you the moment you pay." },
  confirmed: { label: "Confirmed", detail: "It's yours. Pick it up at the showroom on your start date." },
  checked_out: { label: "Out with you", detail: "Enjoy it. Bring it back by your return date; late returns are $30 per day." },
  late: { label: "Overdue", detail: "This piece is past its return date. Late fees are $30 per day until it's back." },
  returned: { label: "Returned", detail: "We've got it back. Thank you." },
  cancelled: { label: "Cancelled", detail: "This booking is cancelled." },
};

/** One rental, as the member sees it. Every rental email links here. RLS limits rows to the member's own. */
export default async function RentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/account/rentals/${id}`)}`);

  const { data: r } = await supabase
    .from("rentals")
    .select("id, status, starts_on, due_on, occasion, quoted_cents, paid_cents, late_fee_cents, late_fees_paid_cents, pieces(title, vendor, image_url)")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const piece = Array.isArray(r.pieces) ? r.pieces[0] : r.pieces;
  const status = STATUS[r.status] ?? { label: r.status, detail: "" };
  const rows: [string, string][] = [
    ["Order", rentalRef(r.id)],
    ["Pick-up", formatDay(r.starts_on)],
    ["Return", formatDay(r.due_on)],
    ...(r.occasion ? [["Occasion", r.occasion] as [string, string]] : []),
    ...(r.quoted_cents != null ? [["Rental rate", formatMoney(r.quoted_cents)] as [string, string]] : []),
    ...(r.paid_cents > 0 ? [["Paid", formatMoney(r.paid_cents)] as [string, string]] : []),
    ...(r.late_fee_cents > 0 ? [["Late fees", formatMoney(r.late_fee_cents)] as [string, string]] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <Link href="/account" className="link text-sm text-smoke">Back to your account</Link>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="plate aspect-square">
          {piece?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={piece.image_url} alt={piece.title} className="h-full w-full object-contain p-8" />
          )}
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-oxblood">{status.label}</p>
            <h1 className="page-title">{piece?.vendor ?? "Your rental"}</h1>
            <p className="text-smoke">{piece?.title}</p>
          </div>
          <p className="text-sm">{status.detail}</p>
          <dl className="divide-y divide-ink/10 border-y border-ink/10 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-smoke">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {r.status === "quoted" && r.quoted_cents != null && <PayButton rentalId={r.id} amountCents={r.quoted_cents} />}
        </div>
      </div>
    </div>
  );
}
