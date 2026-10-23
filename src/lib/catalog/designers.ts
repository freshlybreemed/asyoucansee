import { groupDesigners, type Designer } from "@/lib/catalog-format";
import { createAdminClient } from "@/lib/supabase/server";

/** Designers with in-stock pieces, from the synced `pieces` table (paged past PostgREST's 1,000-row cap). */
export async function listDesigners(): Promise<Designer[]> {
  const db = createAdminClient();
  const vendors: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("pieces").select("vendor").range(from, from + 999);
    if (error) throw new Error(error.message);
    vendors.push(...data.map((r) => r.vendor ?? ""));
    if (data.length < 1000) break;
  }
  return groupDesigners(vendors);
}

export async function findDesigner(key: string): Promise<Designer | undefined> {
  return (await listDesigners()).find((d) => d.key === key);
}
