"use client";

import { useRef, useState } from "react";
import RichText from "@/components/rich-text";

export default function LivePreviewTextarea({
  name,
  placeholder,
  defaultValue = "",
  textareaId,
}: {
  name: string;
  placeholder?: string;
  defaultValue?: string;
  textareaId?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function insert(snippet: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
      <div>
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => insert("# Heading\n")} className="rounded border px-2 py-1">H1</button>
          <button type="button" onClick={() => insert("## Subheading\n")} className="rounded border px-2 py-1">H2</button>
          <button type="button" onClick={() => insert("- Bullet item\n")} className="rounded border px-2 py-1">• List</button>
          <button type="button" onClick={() => insert("1. Numbered item\n")} className="rounded border px-2 py-1">1. List</button>
          <button type="button" onClick={() => insert("\n> Quote\n")} className="rounded border px-2 py-1">Quote</button>
        </div>
        <textarea
          id={textareaId}
          ref={ref}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-56 w-full rounded-lg border px-3 py-2"
          required
        />
      </div>
      <div className="min-h-56 rounded-lg border bg-zinc-50 p-3 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Live formatted preview</p>
        <div className="text-zinc-800">{value ? <RichText content={value} light /> : "Start typing to preview..."}</div>
      </div>
    </div>
  );
}
