"use client";

export default function PublicationExcerptTool({ abstractId, excerptId }: { abstractId: string; excerptId: string }) {
  function generate() {
    const abstractEl = document.getElementById(abstractId) as HTMLTextAreaElement | null;
    const excerptEl = document.getElementById(excerptId) as HTMLTextAreaElement | null;
    if (!abstractEl || !excerptEl) return;

    const words = abstractEl.value.trim().split(/\s+/).filter(Boolean);
    const out = words.slice(0, 100).join(" ");
    excerptEl.value = out;
    excerptEl.dispatchEvent(new Event("input", { bubbles: true }));
    excerptEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <button type="button" onClick={generate} className="rounded border px-3 py-1.5 text-sm">
      Auto-generate Excerpt (first 100 words)
    </button>
  );
}
