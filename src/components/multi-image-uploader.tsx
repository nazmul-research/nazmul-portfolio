"use client";

import { useEffect, useRef, useState } from "react";

export default function MultiImageUploader({ targetInputId, uploadContext = "blog" }: { targetInputId: string; uploadContext?: "profile" | "blog" }) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = document.getElementById(targetInputId) as HTMLInputElement | null;
    if (!input) return;
    try {
      const parsed = JSON.parse(input.value || "[]");
      if (Array.isArray(parsed)) setImages(parsed.filter((x) => typeof x === "string"));
    } catch {
      setImages([]);
    }
  }, [targetInputId]);

  function sync(next: string[]) {
    setImages(next);
    const input = document.getElementById(targetInputId) as HTMLInputElement | null;
    if (!input) return;
    input.value = JSON.stringify(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function uploadFile(file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("context", uploadContext);
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
    return String(data.url);
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-xs font-medium text-zinc-600">Cover slider images (optional, multiple)</p>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        setError(null);
        try {
          const urls: string[] = [];
          for (const f of files) urls.push(await uploadFile(f));
          sync([...images, ...urls]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
          setUploading(false);
          e.currentTarget.value = "";
        }
      }} />
      <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => fileRef.current?.click()}>
        Upload multiple cover images
      </button>
      {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {images.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="rounded border p-1">
              <img src={src} alt={`cover-${i}`} className="h-20 w-full rounded object-cover" />
              <button type="button" className="mt-1 w-full rounded border px-2 py-1 text-xs" onClick={() => sync(images.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
