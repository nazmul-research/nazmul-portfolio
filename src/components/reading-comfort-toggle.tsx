"use client";

import { useState } from "react";

export default function ReadingComfortToggle() {
  const [compact, setCompact] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !compact;
        setCompact(next);
        document.documentElement.dataset.reading = next ? "compact" : "comfortable";
      }}
      className="rounded border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-100 hover:bg-white/10"
    >
      {compact ? "Comfortable" : "Compact"} reading
    </button>
  );
}
