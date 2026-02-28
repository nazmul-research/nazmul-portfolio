"use client";

import { useRef, useState } from "react";

export default function CvUploader({ targetInputId }: { targetInputId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onPick(file: File) {
    setError(null);
    setName(file.name);
    try {
      setUploading(true);
      const body = new FormData();
      body.append("file", file);
      body.append("context", "cv");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      const input = document.getElementById(targetInputId) as HTMLInputElement | null;
      if (input) {
        input.value = String(data.url);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void onPick(f);
      }} />
      <button type="button" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700" onClick={() => fileRef.current?.click()}>
        Upload CV (PDF)
      </button>
      <p className="text-xs text-zinc-500">{uploading ? "Uploading..." : name || "No file chosen"}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
