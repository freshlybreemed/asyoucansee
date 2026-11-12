/**
 * The house email: one table-based layout with inline styles, so it holds up in Gmail, Outlook and Apple Mail.
 * Every template passes structured parts; this renders matching HTML and plain-text bodies.
 */
import { siteUrl } from "@/lib/site-url";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  /** One-line version for SMS. */
  sms: string;
}

export interface EmailParts {
  subject: string;
  /** Inbox preview text shown after the subject. */
  preheader: string;
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  piece?: { vendor: string | null; title: string; imageUrl: string | null } | null;
  details?: [label: string, value: string][];
  cta?: { label: string; url: string };
  /** Small print under the button. */
  note?: string;
  audience?: "member" | "staff";
  sms?: string;
}

const C = {
  paper: "#F6F6F4",
  plate: "#E9E8E5",
  ink: "#000000",
  smoke: "#6B6A68",
  oxblood: "#4A0D16",
  rose: "#C69A90",
  hairline: "#DCDAD6",
};
const SANS = "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Shopify CDN images resize by query param; anything else passes through untouched. */
function sizedImage(url: string, width: number): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("shopify.com")) u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url;
  }
}

function pieceBlock(piece: NonNullable<EmailParts["piece"]>): string {
  const img = piece.imageUrl
    ? `<tr><td align="center" style="background:${C.plate};padding:32px 24px;">
        <img src="${escapeHtml(sizedImage(piece.imageUrl, 800))}" width="360" alt="${escapeHtml(piece.title)}" style="display:block;width:100%;max-width:360px;height:auto;border:0;mix-blend-mode:multiply;" />
      </td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    ${img}
    <tr><td style="padding:16px 0 0;font-family:${SANS};">
      ${piece.vendor ? `<div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.ink};">${escapeHtml(piece.vendor)}</div>` : ""}
      <div style="font-size:15px;line-height:22px;color:${C.smoke};padding-top:2px;">${escapeHtml(piece.title)}</div>
    </td></tr>
  </table>`;
}

function detailsBlock(details: NonNullable<EmailParts["details"]>): string {
  const rows = details
    .map(
      ([label, value]) => `<tr>
        <td style="padding:12px 0;border-top:1px solid ${C.hairline};font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.smoke};">${escapeHtml(label)}</td>
        <td align="right" style="padding:12px 0;border-top:1px solid ${C.hairline};font-family:${SANS};font-size:15px;color:${C.ink};">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;border-bottom:1px solid ${C.hairline};">${rows}</table>`;
}

function button(cta: NonNullable<EmailParts["cta"]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr><td align="center" bgcolor="${C.ink}" style="border-radius:999px;">
      <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:16px 34px;font-family:${SANS};font-size:15px;font-weight:600;letter-spacing:0.01em;color:${C.paper};text-decoration:none;border-radius:999px;">${escapeHtml(cta.label)}</a>
    </td></tr>
  </table>`;
}

function footer(audience: "member" | "staff"): string {
  const link = (label: string, path: string) =>
    `<a href="${siteUrl(path)}" style="color:${C.paper};text-decoration:none;">${label}</a>`;
  const why =
    audience === "staff"
      ? "Staff alert from the As You Can See admin."
      : "You're receiving this because of activity on your As You Can See account.";
  return `<tr><td style="background:${C.oxblood};padding:40px 40px 32px;font-family:${SANS};color:${C.paper};">
    <div style="font-size:17px;font-weight:600;letter-spacing:-0.01em;">Seeing is different than looking.</div>
    <div style="font-size:13px;line-height:20px;color:${C.rose};padding-top:6px;">The 24-hour showroom. Los Angeles and South Florida.</div>
    <div style="font-size:13px;padding-top:24px;">
      ${link("Shop", "/shop")}&nbsp;&nbsp;·&nbsp;&nbsp;${link("Rent", "/rent")}&nbsp;&nbsp;·&nbsp;&nbsp;${link("Sell", "/sell")}&nbsp;&nbsp;·&nbsp;&nbsp;${link("Account", "/account")}
    </div>
    <div style="font-size:44px;line-height:40px;font-weight:800;letter-spacing:-0.03em;padding-top:36px;color:${C.paper};">As You Can See</div>
    <div style="font-size:11px;line-height:16px;color:rgba(246,246,244,0.6);padding-top:20px;">${why}</div>
  </td></tr>`;
}

/** Render parts into the branded HTML email plus a matching plain-text body. */
export function renderEmail(p: EmailParts): EmailContent {
  const audience = p.audience ?? "member";
  const paragraphs = p.paragraphs
    .map((t) => `<p style="margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:25px;color:${C.ink};">${escapeHtml(t)}</p>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(p.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&display=swap" rel="stylesheet" />
<style>
  @media (max-width: 620px) { .px { padding-left: 24px !important; padding-right: 24px !important; } .h1 { font-size: 34px !important; line-height: 34px !important; } }
  a { color: ${C.ink}; }
</style>
</head>
<body style="margin:0;padding:0;background:${C.plate};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(p.preheader)}${"&nbsp;&zwnj;".repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.plate};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.paper};">
      <tr><td align="center" style="background:${C.oxblood};padding:28px 40px;">
        <a href="${siteUrl("/")}" style="text-decoration:none;">
          <img src="${siteUrl("/brand/monogram.png")}" width="52" height="52" alt="As You Can See" style="display:block;border:0;margin:0 auto;" />
        </a>
      </td></tr>
      <tr><td class="px" style="padding:44px 40px 12px;">
        <div style="font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${C.oxblood};padding-bottom:14px;">${escapeHtml(p.eyebrow)}</div>
        <h1 class="h1" style="margin:0 0 24px;font-family:${SANS};font-size:42px;line-height:40px;font-weight:800;letter-spacing:-0.03em;font-stretch:125%;color:${C.ink};">${escapeHtml(p.heading)}</h1>
        ${paragraphs}
      </td></tr>
      <tr><td class="px" style="padding:12px 40px 36px;">
        ${p.piece ? pieceBlock(p.piece) : ""}
        ${p.details?.length ? detailsBlock(p.details) : ""}
        ${p.cta ? button(p.cta) : ""}
        ${p.note ? `<p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.smoke};">${escapeHtml(p.note)}</p>` : ""}
      </td></tr>
      ${footer(audience)}
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    p.heading,
    "",
    ...p.paragraphs.flatMap((t) => [t, ""]),
    ...(p.piece ? [[p.piece.vendor, p.piece.title].filter(Boolean).join(": "), ""] : []),
    ...(p.details?.length ? [...p.details.map(([l, v]) => `${l}: ${v}`), ""] : []),
    ...(p.cta ? [`${p.cta.label}: ${p.cta.url}`, ""] : []),
    ...(p.note ? [p.note, ""] : []),
    "As You Can See",
    siteUrl("/"),
  ].join("\n");

  const sms = p.sms ?? `As You Can See: ${p.heading} ${p.cta ? p.cta.url : ""}`.trim();
  return { subject: p.subject, html, text, sms };
}
