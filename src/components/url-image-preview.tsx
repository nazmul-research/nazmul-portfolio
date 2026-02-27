"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function UrlImagePreview({ inputId }: { inputId: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    if (!el) return;

    const sync = () => setUrl(el.value.trim());
    sync();

    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
    return () => {
      el.removeEventListener("input", sync);
      el.removeEventListener("change", sync);
    };
  }, [inputId]);

  if (!url) return null;

  return (
    <div className="rounded border p-2">
      <p className="mb-1 text-xs text-zinc-500">Image preview</p>
      <Image src={url} alt="Cover preview" width={420} height={180} className="h-28 w-full rounded object-cover" />
    </div>
  );
}
