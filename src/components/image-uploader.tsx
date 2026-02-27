"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

type Props = {
  targetInputId: string;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function cropToDataUrl(src: string, pixels: Area): Promise<string> {
  const img = new window.Image();
  img.src = src;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(pixels.width));
  canvas.height = Math.max(1, Math.floor(pixels.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;

  ctx.drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function ImageUploader({ targetInputId }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  function applyValue(value: string) {
    setPreview(value);
    const input = document.getElementById(targetInputId) as HTMLInputElement | null;
    if (input) input.value = value;
  }

  async function handlePick(file: File) {
    setError(null);
    setFileName(file.name);
    try {
      const dataUrl = await readAsDataUrl(file);
      setSource(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch {
      setError("Could not read image file.");
    }
  }

  async function applyCrop() {
    if (!source || !cropPixels) return;
    try {
      const out = await cropToDataUrl(source, cropPixels);
      applyValue(out);
      setSource(null);
    } catch {
      setError("Cropping failed.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <label>Aspect:</label>
        <button type="button" className={`rounded border px-2 py-1 ${aspect === 1 ? "bg-zinc-100" : ""}`} onClick={() => setAspect(1)}>1:1</button>
        <button type="button" className={`rounded border px-2 py-1 ${aspect === 16 / 9 ? "bg-zinc-100" : ""}`} onClick={() => setAspect(16 / 9)}>16:9</button>
        <button type="button" className={`rounded border px-2 py-1 ${aspect === 4 / 5 ? "bg-zinc-100" : ""}`} onClick={() => setAspect(4 / 5)}>4:5</button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePick(file);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={() => fileRef.current?.click()}
        >
          Choose image
        </button>
        <span className="truncate text-xs text-zinc-500">{fileName || "No file chosen"}</span>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {preview && <Image src={preview} alt="Upload preview" width={120} height={120} className="h-24 w-24 rounded-md object-cover" />}

      {source && (
        <div className="space-y-2 rounded-lg border p-2">
          <div className="relative h-64 w-full overflow-hidden rounded bg-zinc-100">
            <Cropper image={source} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCropPixels(pixels)} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label>Zoom</label>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={() => void applyCrop()}>Apply crop</button>
            <button type="button" className="btn-secondary" onClick={() => setSource(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
