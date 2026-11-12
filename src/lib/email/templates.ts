/** Every transactional email the site sends, as pure functions of the rental/consignment data. */
import { formatMoney } from "@/lib/catalog-format";
import { siteUrl } from "@/lib/site-url";
import { renderEmail, type EmailContent } from "./layout";

export interface RentalEmailData {
  id: string;
  startsOn: string;
  dueOn: string;
  piece: { title: string; vendor: string | null; imageUrl: string | null } | null;
}

/** Short, human order number: AYCS-1A2B3C4D. */
export function rentalRef(id: string): string {
  return `AYCS-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** "2026-11-20" -> "Fri, Nov 20, 2026". Dates are calendar days, so format in UTC to avoid shifting. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const rentalUrl = (id: string) => siteUrl(`/account/rentals/${id}`);
const adminRentalUrl = (id: string) => siteUrl(`/admin#rental-${id}`);

const pieceName = (r: RentalEmailData) => r.piece?.title ?? "your piece";
const dates = (r: RentalEmailData): [string, string][] => [
  ["Pick-up", formatDay(r.startsOn)],
  ["Return", formatDay(r.dueOn)],
];
const orderLine = (r: RentalEmailData): [string, string] => ["Order", rentalRef(r.id)];

// Member emails

export function rentalRequested(r: RentalEmailData): EmailContent {
  return renderEmail({
    subject: `We've got your request: ${pieceName(r)}`,
    preheader: "We'll come back to you with your rate shortly.",
    eyebrow: `Request received · ${rentalRef(r.id)}`,
    heading: "Request received.",
    paragraphs: [
      "Thank you. We're looking at your dates now and will come back to you with your rate shortly.",
      "Nothing is charged until you approve the rate.",
    ],
    piece: r.piece,
    details: [orderLine(r), ...dates(r)],
    cta: { label: "View your request", url: rentalUrl(r.id) },
  });
}

export function rentalQuoted(r: RentalEmailData, amountCents: number): EmailContent {
  const amount = formatMoney(amountCents);
  return renderEmail({
    subject: `Your rate is ready: ${pieceName(r)}`,
    preheader: `${amount} for ${formatDay(r.startsOn)} to ${formatDay(r.dueOn)}. Pay to lock it in.`,
    eyebrow: `Your rate · ${rentalRef(r.id)}`,
    heading: "Your rate is ready.",
    paragraphs: ["We've set your rate for these dates. Pay from your account to lock the piece in. It's held for you the moment you pay."],
    piece: r.piece,
    details: [orderLine(r), ...dates(r), ["Rental rate", amount]],
    cta: { label: `Review and pay ${amount}`, url: rentalUrl(r.id) },
    note: "Questions about your rate? Reply to this email.",
    sms: `As You Can See: your rate for ${pieceName(r)} is ${amount}. Pay to lock it in: ${rentalUrl(r.id)}`,
  });
}

export function rentalConfirmed(r: RentalEmailData, paidCents?: number): EmailContent {
  return renderEmail({
    subject: `Confirmed: ${pieceName(r)} is yours`,
    preheader: `Pick up ${formatDay(r.startsOn)}. Return by ${formatDay(r.dueOn)}.`,
    eyebrow: `Confirmed · ${rentalRef(r.id)}`,
    heading: "It's yours.",
    paragraphs: ["Your rental is confirmed and the piece is held for you. See you at the showroom."],
    piece: r.piece,
    details: [orderLine(r), ...dates(r), ...(paidCents ? [["Paid", formatMoney(paidCents)] as [string, string]] : [])],
    cta: { label: "View your rental", url: rentalUrl(r.id) },
    note: "Late returns are $30 per day, charged to your card on file.",
  });
}

export function rentalDeclined(r: RentalEmailData): EmailContent {
  return renderEmail({
    subject: `About your request: ${pieceName(r)}`,
    preheader: "This piece isn't available for your dates.",
    eyebrow: `Request update · ${rentalRef(r.id)}`,
    heading: "Not this time.",
    paragraphs: [
      `${pieceName(r)} isn't available for ${formatDay(r.startsOn)} to ${formatDay(r.dueOn)}.`,
      "Reply to this email and we'll find you something just as good.",
    ],
    piece: r.piece,
    cta: { label: "Browse rentals", url: siteUrl("/rent") },
  });
}

export function rentalCancelled(r: RentalEmailData): EmailContent {
  return renderEmail({
    subject: `Cancelled: ${pieceName(r)}`,
    preheader: `Your booking for ${formatDay(r.startsOn)} to ${formatDay(r.dueOn)} is cancelled.`,
    eyebrow: `Cancelled · ${rentalRef(r.id)}`,
    heading: "Your rental is cancelled.",
    paragraphs: ["We've cancelled this booking. If that's a surprise, reply to this email and we'll sort it out."],
    piece: r.piece,
    details: [orderLine(r), ...dates(r)],
    cta: { label: "View your account", url: rentalUrl(r.id) },
  });
}

export function rentalCheckedOut(r: RentalEmailData): EmailContent {
  return renderEmail({
    subject: `Enjoy it. Due back ${formatDay(r.dueOn)}`,
    preheader: `${pieceName(r)} is out with you. Return by ${formatDay(r.dueOn)}.`,
    eyebrow: `Out with you · ${rentalRef(r.id)}`,
    heading: "Enjoy the piece.",
    paragraphs: [`Wear it well. Bring it back to the showroom by ${formatDay(r.dueOn)}.`],
    piece: r.piece,
    details: [orderLine(r), ["Due back", formatDay(r.dueOn)]],
    cta: { label: "View your rental", url: rentalUrl(r.id) },
    note: "Late returns are $30 per day, charged to your card on file.",
  });
}

export function rentalReturned(r: RentalEmailData, lateFeeCents = 0): EmailContent {
  return renderEmail({
    subject: `Returned: ${pieceName(r)}`,
    preheader: "We've got it back. Thank you.",
    eyebrow: `Returned · ${rentalRef(r.id)}`,
    heading: "Back in the showroom.",
    paragraphs: ["We've got the piece back. Thank you for taking care of it. Come see what's new."],
    piece: r.piece,
    details: [orderLine(r), ...(lateFeeCents > 0 ? [["Late fees", formatMoney(lateFeeCents)] as [string, string]] : [])],
    cta: { label: "See what's new", url: siteUrl("/shop") },
  });
}

export function rentalReturnReminder(r: RentalEmailData, when: "due_tomorrow" | "due_today"): EmailContent {
  const today = when === "due_today";
  return renderEmail({
    subject: today ? `Due back today: ${pieceName(r)}` : `Due back tomorrow: ${pieceName(r)}`,
    preheader: today ? "Drop it at the showroom today to avoid late fees." : `Return by ${formatDay(r.dueOn)} to avoid late fees.`,
    eyebrow: `Return reminder · ${rentalRef(r.id)}`,
    heading: today ? "Due back today." : "Due back tomorrow.",
    paragraphs: [
      today
        ? "Hope you wore it well. Bring the piece back to the showroom today."
        : `Hope you're wearing it well. A reminder that it's due back tomorrow, ${formatDay(r.dueOn)}.`,
      "The showroom is open 24 hours. Need a little longer? Reply to this email before it's late and we'll see what we can do.",
    ],
    piece: r.piece,
    details: [orderLine(r), ["Due back", formatDay(r.dueOn)]],
    cta: { label: "View your rental", url: rentalUrl(r.id) },
    note: "Late returns are $30 per day, charged to your card on file.",
    sms: `As You Can See: ${pieceName(r)} is due back ${today ? "today" : "tomorrow"} (${formatDay(r.dueOn)}). Late returns are $30/day. ${rentalUrl(r.id)}`,
  });
}

export function rentalOverdue(r: RentalEmailData, daysLate: number, totalLateFeeCents: number, chargeFailed = false): EmailContent {
  return renderEmail({
    subject: `Overdue: ${pieceName(r)} was due ${formatDay(r.dueOn)}`,
    preheader: `${daysLate} day${daysLate === 1 ? "" : "s"} late. $30 per day until it's back.`,
    eyebrow: `Overdue · ${rentalRef(r.id)}`,
    heading: "This one's overdue.",
    paragraphs: [
      chargeFailed
        ? `${pieceName(r)} was due back ${formatDay(r.dueOn)}. Late returns are $30 per day until it's returned. We couldn't charge your card on file, so the balance will be settled when you bring it back.`
        : `${pieceName(r)} was due back ${formatDay(r.dueOn)}. Late returns are $30 per day, charged to your card on file until it's returned.`,
      "Bring it to the showroom as soon as you can, or reply if something's come up.",
    ],
    piece: r.piece,
    details: [orderLine(r), ["Was due", formatDay(r.dueOn)], ["Days late", String(daysLate)], ["Late fees so far", formatMoney(totalLateFeeCents)]],
    cta: { label: "View your rental", url: rentalUrl(r.id) },
    sms: `As You Can See: ${pieceName(r)} was due ${formatDay(r.dueOn)} and is ${daysLate} day(s) late. $30/day until returned. ${rentalUrl(r.id)}`,
  });
}

export function consignmentReceived(c: { fullName: string; designers: string }): EmailContent {
  return renderEmail({
    subject: "We've got your consignment submission",
    preheader: "We'll review your pieces and get back to you.",
    eyebrow: "Consignment",
    heading: "Thank you. We're taking a look.",
    paragraphs: [
      `Hi ${c.fullName.split(" ")[0]}, we've received your submission (${c.designers}).`,
      "Our team reviews every piece. If it's a fit, we'll be in touch about next steps and pricing.",
    ],
    cta: { label: "How consigning works", url: siteUrl("/sell") },
    note: "Have more to add? Reply to this email.",
  });
}

// Staff alerts

export function staffRentalRequest(
  r: RentalEmailData,
  m: { name: string; tier: string; occasion?: string | null; budgetCents: number | null; suggestedCents: number | null },
): EmailContent {
  return renderEmail({
    audience: "staff",
    subject: `Rental request: ${pieceName(r)} for ${m.name}`,
    preheader: `${formatDay(r.startsOn)} to ${formatDay(r.dueOn)}. Needs a rate.`,
    eyebrow: `New request · ${rentalRef(r.id)}`,
    heading: "New rental request.",
    paragraphs: [`${m.name} (${m.tier}) wants to rent this piece.`, ...(m.occasion ? [`For: ${m.occasion}`] : [])],
    piece: r.piece,
    details: [
      orderLine(r),
      ...dates(r),
      ["Budget", m.budgetCents === null ? "Not given" : formatMoney(m.budgetCents)],
      ["Suggested rate", m.suggestedCents === null ? "n/a" : formatMoney(m.suggestedCents)],
    ],
    cta: { label: "Set a rate", url: adminRentalUrl(r.id) },
  });
}

export function staffRentalPaid(r: RentalEmailData, m: { name: string }, paidCents?: number): EmailContent {
  return renderEmail({
    audience: "staff",
    subject: `Rental paid: ${pieceName(r)} by ${m.name}`,
    preheader: `${formatDay(r.startsOn)} to ${formatDay(r.dueOn)}. Confirmed.`,
    eyebrow: `Paid · ${rentalRef(r.id)}`,
    heading: "Rental paid.",
    paragraphs: [`${m.name} paid and the rental is confirmed. The piece is held off Shopify.`],
    piece: r.piece,
    details: [orderLine(r), ...dates(r), ...(paidCents ? [["Paid", formatMoney(paidCents)] as [string, string]] : [])],
    cta: { label: "Open in admin", url: adminRentalUrl(r.id) },
  });
}

export function staffConsignment(c: {
  id: string;
  fullName: string;
  email: string;
  socialHandle?: string | null;
  designers: string;
  items: string;
  estimatedValue?: string | null;
  photoCount: number;
}): EmailContent {
  return renderEmail({
    audience: "staff",
    subject: `Consignment: ${c.fullName} (${c.designers})`,
    preheader: `${c.photoCount} photo(s). ${c.items.slice(0, 80)}`,
    eyebrow: "New consignment",
    heading: "New consignment.",
    paragraphs: [c.items],
    details: [
      ["From", c.fullName],
      ["Contact", [c.email, c.socialHandle].filter(Boolean).join(", ")],
      ["Designers", c.designers],
      ...(c.estimatedValue ? [["Estimated value", c.estimatedValue] as [string, string]] : []),
      ["Photos", String(c.photoCount)],
    ],
    cta: { label: "Review submission", url: siteUrl(`/admin/consignments#consignment-${c.id}`) },
  });
}
