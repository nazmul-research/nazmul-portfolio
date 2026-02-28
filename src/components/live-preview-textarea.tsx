"use client";

import { useEffect, useRef, useState } from "react";
import RichText from "@/components/rich-text";

export default function LivePreviewTextarea({
  name,
  placeholder,
  defaultValue = "",
  textareaId,
  formId,
  autosaveKey,
}: {
  name: string;
  placeholder?: string;
  defaultValue?: string;
  textareaId?: string;
  formId?: string;
  autosaveKey?: string;
}) {
  const initialAutosave = (() => {
    if (typeof window === "undefined" || !autosaveKey) return { value: defaultValue, ts: null as number | null };
    try {
      const raw = localStorage.getItem(autosaveKey);
      if (!raw) return { value: defaultValue, ts: null as number | null };
      const parsed = JSON.parse(raw) as { value?: string; ts?: number };
      return {
        value: typeof parsed.value === "string" && parsed.value.length > 0 ? parsed.value : defaultValue,
        ts: typeof parsed.ts === "number" ? parsed.ts : null,
      };
    } catch {
      return { value: defaultValue, ts: null as number | null };
    }
  })();

  const [value, setValue] = useState(initialAutosave.value);
  const [savedAt, setSavedAt] = useState<number | null>(initialAutosave.ts);
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
    body.append("context", "blog");
    const res = await fetch("/api/upload", { method: "POST", body });
    const raw = await res.text();
    const data = raw ? JSON.parse(raw) : {};
    if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
    insert(`\n![inline image](${data.url})\n`);
  }

  useEffect(() => {
    if (!autosaveKey) return;
    const t = setTimeout(() => {
      localStorage.setItem(autosaveKey, JSON.stringify({ value, ts: Date.now() }));
      setSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(t);
  }, [value, autosaveKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmd = e.ctrlKey || e.metaKey;
      if (!cmd) return;

      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const form = formId ? (document.getElementById(formId) as HTMLFormElement | null) : null;
        if (form) form.requestSubmit();
      }

      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        insert("**bold text**");
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const snippets = [
    "## Key takeaway\n",
    "## Why this matters\n",
    "## Implementation notes\n",
    "### Final thoughts\n",
  ];

  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
      <div>
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => insert("# Heading\n")} className="rounded border px-2 py-1">H1</button>
          <button type="button" onClick={() => insert("## Subheading\n")} className="rounded border px-2 py-1">H2</button>
          <button type="button" onClick={() => insert("- Bullet item\n")} className="rounded border px-2 py-1">• List</button>
          <button type="button" onClick={() => insert("1. Numbered item\n")} className="rounded border px-2 py-1">1. List</button>
          <button type="button" onClick={() => insert("\n> Quote\n")} className="rounded border px-2 py-1">Quote</button>
          <button type="button" onClick={() => insert("[link text](https://example.com)")} className="rounded border px-2 py-1">Link</button>
          <button type="button" onClick={() => insert("\n```ts\n// code here\n```\n")} className="rounded border px-2 py-1">Code</button>
          <button type="button" onClick={insertImageMarkdownUrl} className="rounded border px-2 py-1">Inline Image URL</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded border px-2 py-1">Inline Image Upload</button>
          <button type="button" onClick={() => insert("🔥")} className="rounded border px-2 py-1">🔥</button>
          <button type="button" onClick={() => insert("🚀")} className="rounded border px-2 py-1">🚀</button>
          <button type="button" onClick={() => insert("🧠")} className="rounded border px-2 py-1">🧠</button>
          {snippets.map((s) => (
            <button key={s} type="button" onClick={() => insert(`\n${s}`)} className="rounded border px-2 py-1">Snippet</button>
          ))}
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

        <p className="mt-2 text-xs text-zinc-500" suppressHydrationWarning>
          {savedAt ? `Autosaved ${new Date(savedAt).toLocaleTimeString()}` : "Autosave enabled"} • Shortcuts: Ctrl/Cmd+S save, Ctrl/Cmd+B bold
        </p>
      </div>
      <div className="min-h-56 rounded-lg border bg-zinc-50 p-3 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Live formatted preview</p>
        <div className="text-zinc-800">{value ? <RichText content={value} light /> : "Start typing to preview..."}</div>
      </div>
    </div>
  );
}
