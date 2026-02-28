"use client";

import { useState } from "react";

export default function ShareRow({ title }: { title: string }) {
  const [url] = useState(() => (typeof window !== "undefined" ? window.location.href : ""));

  function copyLink() {
    navigator.clipboard.writeText(url || window.location.href).catch(() => {});
  }

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <button type="button" onClick={copyLink} className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/10">
        Copy link
      </button>
      <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/10">Share on X</a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-zinc-100 hover:bg-white/10">Share on LinkedIn</a>
    </div>
  );
}
