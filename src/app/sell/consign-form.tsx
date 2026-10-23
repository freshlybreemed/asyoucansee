"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MAX_PHOTOS, PHOTO_BUCKET } from "@/lib/consignment-photos";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { createPhotoUploads, submitConsignment, type ConsignState } from "./actions";

const field = "w-full border px-3 py-2 text-sm";
const MAX_EDGE = 2400;

/** Shrink big phone photos before upload. Falls back to the original if the browser can't decode it (e.g. HEIC). */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function ConsignForm() {
  const [state, action, submitting] = useActionState<ConsignState, FormData>(submitConsignment, {});
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const pending = submitting || uploading;

  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [photos]);

  if (state.ok) {
    return <p className="border p-6">Got it. We review every submission and will reach out within a few days.</p>;
  }

  function addPhotos(files: FileList | null) {
    setUploadError(null);
    const next = [...photos, ...Array.from(files ?? [])];
    if (next.length > MAX_PHOTOS) setUploadError(`Up to ${MAX_PHOTOS} photos`);
    setPhotos(next.slice(0, MAX_PHOTOS));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.delete("photos");
    setUploadError(null);
    startUpload(async () => {
      if (photos.length) {
        const blobs = await Promise.all(photos.map(shrink));
        const { uploads, error } = await createPhotoUploads(blobs.map((b) => b.type));
        if (!uploads) return setUploadError(error ?? "Upload failed");
        const storage = createBrowserSupabase().storage.from(PHOTO_BUCKET);
        const results = await Promise.all(
          uploads.map((u, i) => storage.uploadToSignedUrl(u.path, u.token, blobs[i], { contentType: blobs[i].type })),
        );
        if (results.some((r) => r.error)) return setUploadError("Some photos didn't upload. Try again.");
        uploads.forEach((u) => form.append("photoPath", u.path));
      }
      // State updates after an await need their own transition.
      startUpload(() => action(form));
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="fullName" placeholder="Name" required className={field} />
        <input name="email" type="email" placeholder="Email" required className={field} />
        <input name="phone" type="tel" placeholder="Phone" className={field} />
        <input name="socialHandle" placeholder="Instagram @" className={field} />
      </div>
      <input name="city" placeholder="City" className={field} />
      <input name="designers" placeholder="Designers (e.g. Rick Owens, JPG, Margiela)" required className={field} />
      <textarea name="items" rows={5} placeholder="What are you selling? Pieces, seasons, sizes, condition." required className={field} />

      <div className="space-y-2 border border-dashed p-4">
        <label className="block cursor-pointer text-sm">
          <span className="underline">Add photos</span>
          <span className="text-neutral-500"> · front, back, labels, any wear. Up to {MAX_PHOTOS}.</span>
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 bg-white/90 px-1.5 text-xs"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="estimatedValue" placeholder="Rough total value (optional)" className={field} />
        <input name="photosUrl" placeholder="Or a link to more photos (optional)" className={field} />
      </div>
      {(uploadError || state.error) && <p className="text-sm text-red-600">{uploadError ?? state.error}</p>}
      <button disabled={pending} className="w-full bg-black py-3 text-xs uppercase tracking-widest text-white disabled:opacity-50">
        {uploading ? "Uploading photos…" : submitting ? "Sending…" : "Submit your pieces"}
      </button>
    </form>
  );
}
