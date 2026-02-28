"use client";

import { useEffect, useState } from "react";

export default function StickyToc({ headings }: { headings: { level: number; text: string; id: string }[] }) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!nodes.length) return;

    function onScroll() {
      let current = nodes[0]?.id || "";
      for (const n of nodes) {
        if (n.getBoundingClientRect().top <= 120) current = n.id;
      }
      setActive(current);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">On this page</p>
      <div className="space-y-1">
        {headings.map((h) => (
          <a key={h.id} href={`#${h.id}`} className={`block rounded px-1 text-sm transition ${h.level === 3 ? "pl-3" : ""} ${active === h.id ? "bg-white/10 text-white" : "text-zinc-200 hover:text-white"}`}>
            {h.text}
          </a>
        ))}
      </div>
    </div>
  );
}
