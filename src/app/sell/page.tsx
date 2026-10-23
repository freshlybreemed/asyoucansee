import type { Metadata } from "next";
import Link from "next/link";
import { ConsignForm } from "./consign-form";

export const metadata: Metadata = { title: "Sell with us" };

// TODO(aycs): replace bracketed terms with real commission split, payout timing, and accepted designers.
const steps = [
  { title: "Submit", body: "Tell us what you have and send photos. Archive, runway, and statement pieces get priority." },
  { title: "We review", body: "We reply within [X] days with what we can take and a suggested price range." },
  { title: "Drop off or pickup", body: "Bring pieces to the showroom, ship them in, or schedule a pickup for larger closets." },
  { title: "Authenticate and shoot", body: "Every piece is inspected, authenticated, photographed, and written up by us." },
  { title: "We sell it", body: "Listed online, shown in the showroom, and offered to our clients and stylists." },
  { title: "You get paid", body: "You keep [X]% of the sale price, paid out within [X] days of the sale." },
];

export default function SellPage() {
  return (
    <div className="grid gap-12 md:grid-cols-2">
      <div className="space-y-8">
        <div className="space-y-6">
          <h1 className="page-title">Sell with us</h1>
          <p className="max-w-md text-lg text-smoke">
            Consign your closet with As You Can See. We handle everything (authentication, photography, pricing, and
            selling) and put your pieces in front of buyers who know what they&apos;re looking at.
          </p>
        </div>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[3rem_1fr] border-t border-ink/15 pt-4">
              <span className="display text-2xl text-oxblood">{i + 1}</span>
              <div>
                <p className="wide">{s.title}</p>
                <p className="text-sm text-smoke">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-smoke">
          See what we&apos;ve placed: <Link href="/archive" className="link text-ink">the sold archive</Link>.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-5 md:mt-4 md:p-8">
        <ConsignForm />
      </div>
    </div>
  );
}
