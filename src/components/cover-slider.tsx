"use client";

import { useEffect, useState } from "react";

export default function CoverSlider({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);

  if (!images.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg">
      <img src={images[idx]} alt={alt} className="h-72 w-full object-cover md:h-96" />
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/35 px-2 py-1">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)} className={`h-2 w-2 rounded-full ${i === idx ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
