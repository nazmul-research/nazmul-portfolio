"use client";

import { useEffect, useState } from "react";

function useInputValue(id: string) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    const sync = () => setValue((el as HTMLInputElement).value || "");
    sync();
    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
    return () => {
      el.removeEventListener("input", sync);
      el.removeEventListener("change", sync);
    };
  }, [id]);

  return value;
}

export default function PublishChecklist({ titleId, excerptId, tagsId, contentId }: { titleId: string; excerptId: string; tagsId: string; contentId: string }) {
  const title = useInputValue(titleId);
  const excerpt = useInputValue(excerptId);
  const tags = useInputValue(tagsId);
  const content = useInputValue(contentId);

  const checks = [
    { ok: title.trim().length >= 3, label: "Title added" },
    { ok: excerpt.trim().length >= 20, label: "Excerpt looks meaningful" },
    { ok: tags.trim().length > 0, label: "Tags added" },
    { ok: content.trim().length >= 50, label: "Content length is solid" },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 md:col-span-2">
      <p className="mb-2 font-semibold">Publish checklist</p>
      <ul className="space-y-1">
        {checks.map((c, i) => (
          <li key={i} className={c.ok ? "text-emerald-700" : "text-zinc-500"}>
            {c.ok ? "✅" : "⬜"} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
