"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  targetInputId: string;
};

export default function ImageUploader({ targetInputId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setPreview(data.url);
      const input = document.getElementById(targetInputId) as HTMLInputElement | null;
      if (input) input.value = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="block w-full text-sm"
      />
      {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {preview && <Image src={preview} alt="Upload preview" width={80} height={80} className="h-20 w-20 rounded-md object-cover" />}
    </div>
  );
}
