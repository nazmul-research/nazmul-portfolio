"use client";

import { useEffect, useState } from "react";

export default function DuplicateCheck({ inputId, taken }: { inputId: string; taken: string[] }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    if (!el) return;
    const sync = () => setValue(el.value.trim().toLowerCase());
    sync();
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [inputId]);

  const exists = Boolean(value) && taken.includes(value);
  if (!exists) return null;

  return <p className="text-xs text-amber-600">Warning: this slug already exists.</p>;
}
