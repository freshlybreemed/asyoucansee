"use server";

import { z } from "zod";
import { notifyStaff } from "@/lib/notify";
import { isPhotoPath, MAX_PHOTOS, PHOTO_BUCKET, photoExtension } from "@/lib/consignment-photos";
import { createAdminClient } from "@/lib/supabase/server";

const ConsignSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().optional(),
  socialHandle: z.string().trim().optional(),
  city: z.string().trim().optional(),
  designers: z.string().trim().min(1, "Which designers?"),
  items: z.string().trim().min(10, "Tell us a little about the pieces"),
  estimatedValue: z.string().trim().optional(),
  photosUrl: z.string().trim().optional(),
});

export type ConsignState = { ok?: true; error?: string };
export type PhotoUpload = { path: string; token: string };

/** Issue signed upload URLs so photos go straight from the browser to storage (no request size limit). */
export async function createPhotoUploads(contentTypes: string[]): Promise<{ uploads?: PhotoUpload[]; error?: string }> {
  if (contentTypes.length > MAX_PHOTOS) return { error: `Up to ${MAX_PHOTOS} photos` };
  const exts = contentTypes.map(photoExtension);
  if (exts.some((e) => !e)) return { error: "Photos must be JPG, PNG, WebP, or HEIC" };

  const folder = `submissions/${crypto.randomUUID()}`;
  const storage = createAdminClient().storage.from(PHOTO_BUCKET);
  const uploads: PhotoUpload[] = [];
  for (const [i, ext] of exts.entries()) {
    const { data, error } = await storage.createSignedUploadUrl(`${folder}/${i}.${ext}`);
    if (error || !data) return { error: "Couldn't start the upload. Try again." };
    uploads.push({ path: data.path, token: data.token });
  }
  return { uploads };
}

export async function submitConsignment(_prev: ConsignState, form: FormData): Promise<ConsignState> {
  if (form.get("company")) return { ok: true }; // honeypot: bots fill hidden fields
  const photoPaths = form.getAll("photoPath").map(String);
  form.delete("photoPath");
  if (photoPaths.length > MAX_PHOTOS || !photoPaths.every(isPhotoPath)) return { error: "Something went wrong with the photos. Try again." };

  const parsed = ConsignSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const f = parsed.data;
  const { error } = await createAdminClient().from("consignments").insert({
    full_name: f.fullName,
    email: f.email,
    phone: f.phone || null,
    social_handle: f.socialHandle || null,
    city: f.city || null,
    designers: f.designers,
    items: f.items,
    estimated_value: f.estimatedValue || null,
    photos_url: f.photosUrl || null,
    photo_paths: photoPaths,
  });
  if (error) return { error: "Something went wrong. Try again or DM us." };
  await notifyStaff(
    `Consignment: ${f.fullName}`,
    `${f.fullName} (${[f.email, f.socialHandle].filter(Boolean).join(", ")}) wants to consign ${f.designers}. ${photoPaths.length} photo(s).\n\n${f.items}`,
    "/admin/consignments",
  );
  return { ok: true };
}
