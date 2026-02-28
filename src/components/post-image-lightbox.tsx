"use client";

import { useState } from "react";

export default function PostImageLightbox({ images }: { images: string[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  if (!images.length) return null;

  return (
    <>
      <button type="button" className="rounded border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-100 hover:bg-white/10" onClick={() => setOpen(true)}>
        View images fullscreen
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(false)}>
          <button type="button" className="absolute right-4 top-4 rounded bg-black/60 px-3 py-1 text-sm text-white" onClick={() => setOpen(false)}>
            Close
          </button>
          {images.length > 1 && (
            <>
              <button type="button" className="absolute left-4 rounded bg-black/60 px-3 py-2 text-white" onClick={(e) => { e.stopPropagation(); setIdx((v) => (v - 1 + images.length) % images.length); }}>
                ◀
              </button>
              <button type="button" className="absolute right-4 rounded bg-black/60 px-3 py-2 text-white" onClick={(e) => { e.stopPropagation(); setIdx((v) => (v + 1) % images.length); }}>
                ▶
              </button>
            </>
          )}
          <img src={images[idx]} alt={`img-${idx + 1}`} className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
