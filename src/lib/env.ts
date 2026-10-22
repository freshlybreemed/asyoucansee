/** Read a required env var at call time so missing config fails loudly where it's used. */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}
