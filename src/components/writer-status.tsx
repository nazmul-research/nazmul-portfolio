"use client";

import { useEffect, useMemo, useState } from "react";

export default function WriterStatus({ contentInputId }: { contentInputId: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const el = document.getElementById(contentInputId) as HTMLTextAreaElement | null;
    if (!el) return;

    const sync = () => setText(el.value || "");
    sync();
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [contentInputId]);

  const { words, minutes } = useMemo(() => {
    const words = (text.trim().match(/\S+/g) || []).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    return { words, minutes };
  }, [text]);

  return (
    <div className="text-xs text-zinc-500">
      {words} words • ~{minutes} min read
    </div>
  );
}
