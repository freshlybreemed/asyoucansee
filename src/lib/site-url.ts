/**
 * Absolute link into the site, for emails and texts.
 * SITE_URL wins (e.g. a custom domain); otherwise the Vercel production host; otherwise local dev.
 */
export function siteUrl(path: string) {
  const explicit = process.env.SITE_URL?.replace(/\/+$/, "");
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const base = explicit || (host ? `https://${host}` : "http://localhost:3100");
  return `${base}${path}`;
}
