"use client";

import { ReactNode, useEffect, useState } from "react";

export default function CoverSlider({
  images,
  alt,
  className = "",
  imageClassName = "h-72 w-full object-cover md:h-96",
  overlay,
}: {
  images: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
  overlay?: ReactNode;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIdx((v) => (v + 1) % images.length);
      if (e.key === "ArrowLeft") setIdx((v) => (v - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg ${className}`}>
      <img src={images[idx]} alt={alt} className={`${imageClassName} transition-all duration-500`} />
      {overlay}
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Previous image" onClick={() => setIdx((v) => (v - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-xs text-white hover:bg-black/65">◀</button>
          <button type="button" aria-label="Next image" onClick={() => setIdx((v) => (v + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-xs text-white hover:bg-black/65">▶</button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/35 px-2 py-1">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => setIdx(i)} className={`h-2 w-2 rounded-full ${i === idx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
