"use client";

type Props = {
  titleInputId: string;
  contentInputId: string;
  excerptInputId: string;
  tagsInputId: string;
};

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "by",
  "is",
  "are",
  "from",
  "at",
  "that",
  "this",
]);

export default function BlogMetaTools({ titleInputId, contentInputId, excerptInputId, tagsInputId }: Props) {
  function generateExcerpt() {
    const titleEl = document.getElementById(titleInputId) as HTMLInputElement | null;
    const contentEl = document.getElementById(contentInputId) as HTMLTextAreaElement | null;
    const excerptEl = document.getElementById(excerptInputId) as HTMLInputElement | null;
    if (!excerptEl) return;

    const src = (contentEl?.value || titleEl?.value || "").replace(/\s+/g, " ").trim();
    if (!src) return;

    const max = 160;
    const text = src.length <= max ? src : `${src.slice(0, max - 1).trimEnd()}…`;
    excerptEl.value = text;
    excerptEl.dispatchEvent(new Event("input", { bubbles: true }));
    excerptEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function generateTags() {
    const titleEl = document.getElementById(titleInputId) as HTMLInputElement | null;
    const contentEl = document.getElementById(contentInputId) as HTMLTextAreaElement | null;
    const tagsEl = document.getElementById(tagsInputId) as HTMLInputElement | null;
    if (!tagsEl) return;

    const text = `${titleEl?.value || ""} ${contentEl?.value || ""}`.toLowerCase();
    const words = text
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w));

    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

    const tags = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([w]) => w)
      .join(", ");

    if (!tags) return;
    tagsEl.value = tags;
    tagsEl.dispatchEvent(new Event("input", { bubbles: true }));
    tagsEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="md:col-span-2 flex flex-wrap gap-2">
      <button type="button" className="btn-secondary" onClick={generateExcerpt}>
        Auto-generate Excerpt
      </button>
      <button type="button" className="btn-secondary" onClick={generateTags}>
        Auto-generate Tags
      </button>
    </div>
  );
}
