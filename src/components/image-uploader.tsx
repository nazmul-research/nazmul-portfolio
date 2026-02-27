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
  const [cropSquare, setCropSquare] = useState(true);

  async function toSquareBlob(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const size = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - size) / 2);
    const sy = Math.floor((bitmap.height - size) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return blob || file;
  }

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const uploadFile = cropSquare ? new File([await toSquareBlob(file)], file.name.replace(/\.[^.]+$/, "") + "-crop.jpg", { type: "image/jpeg" }) : file;

      const body = new FormData();
      body.append("file", uploadFile);
      const res = await fetch("/api/upload", { method: "POST", body });
      const raw = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: "Upload failed: server returned invalid response" };
      }
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");

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
      <div className="flex items-center gap-2 text-xs">
        <input id={`crop-${targetInputId}`} type="checkbox" checked={cropSquare} onChange={(e) => setCropSquare(e.target.checked)} />
        <label htmlFor={`crop-${targetInputId}`}>Crop to square</label>
      </div>
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
