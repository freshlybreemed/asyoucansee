/** Where to send someone after sign-in or sign-up. Only same-site paths, so the link can't bounce people off-site. */
export function safeNext(next: unknown, fallback = "/account"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
