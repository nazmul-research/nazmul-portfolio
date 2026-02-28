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
  const fileRef = useRef<HTMLInputElement | null>(null);

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
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function insertImageMarkdownUrl() {
    const url = window.prompt("Paste image URL for inline post image:", "https://");
    if (!url) return;
    insert(`\n![inline image](${url})\n`);
  }

  async function uploadInlineImage(file: File) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
    insert(`\n![inline image](${data.url})\n`);
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
          <button type="button" onClick={insertImageMarkdownUrl} className="rounded border px-2 py-1">Inline Image URL</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded border px-2 py-1">Inline Image Upload</button>
          <button type="button" onClick={() => insert("🔥")} className="rounded border px-2 py-1">🔥</button>
          <button type="button" onClick={() => insert("🚀")} className="rounded border px-2 py-1">🚀</button>
          <button type="button" onClick={() => insert("🧠")} className="rounded border px-2 py-1">🧠</button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              await uploadInlineImage(file);
            } catch (err) {
              window.alert(err instanceof Error ? err.message : "Inline image upload failed");
            }
            e.currentTarget.value = "";
          }}
        />

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
