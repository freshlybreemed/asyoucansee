/** Rules for consignment photo uploads, shared by the form and the server. */

export const PHOTO_BUCKET = "consignments";
export const MAX_PHOTOS = 10;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function photoExtension(contentType: string): string | null {
  return EXTENSIONS[contentType] ?? null;
}

const PATH = /^submissions\/[0-9a-f-]{36}\/\d{1,2}\.(jpg|png|webp|heic|heif)$/;

/** Only accept paths in the shape we issued, so a submission can't point at someone else's files. */
export function isPhotoPath(path: string): boolean {
  return PATH.test(path);
}
