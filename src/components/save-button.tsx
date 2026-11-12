"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Submit button for admin forms: shows "Saving…" while the action runs, then "Saved ✓" for a moment. */
export function SaveButton({ children = "Save", className }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2000);
      wasPending.current = false;
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <button disabled={pending} className={className}>
      {pending ? "Saving…" : saved ? "Saved ✓" : children}
    </button>
  );
}
