import { describe, expect, it } from "vitest";
import { isPhotoPath, photoExtension } from "@/lib/consignment-photos";

describe("consignment photos", () => {
  it("maps image types to extensions", () => {
    expect(photoExtension("image/jpeg")).toBe("jpg");
    expect(photoExtension("application/pdf")).toBeNull();
  });

  it("only accepts paths in the issued shape", () => {
    expect(isPhotoPath("submissions/0b6c1a3e-2f1d-4c1e-9a6b-1f2e3d4c5b6a/0.jpg")).toBe(true);
    expect(isPhotoPath("submissions/../secrets/0.jpg")).toBe(false);
    expect(isPhotoPath("other/0b6c1a3e-2f1d-4c1e-9a6b-1f2e3d4c5b6a/0.jpg")).toBe(false);
  });
});
