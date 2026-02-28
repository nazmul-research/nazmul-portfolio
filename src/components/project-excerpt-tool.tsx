"use client";

export default function ProjectExcerptTool({ detailsId, excerptId }: { detailsId: string; excerptId: string }) {
  function generate() {
    const detailsEl = document.getElementById(detailsId) as HTMLTextAreaElement | null;
    const excerptEl = document.getElementById(excerptId) as HTMLTextAreaElement | null;
    if (!detailsEl || !excerptEl) return;

    const words = detailsEl.value.trim().split(/\s+/).filter(Boolean);
    excerptEl.value = words.slice(0, 100).join(" ");
    excerptEl.dispatchEvent(new Event("input", { bubbles: true }));
    excerptEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <button type="button" onClick={generate} className="rounded border px-3 py-1.5 text-sm">
      Auto-generate Excerpt (first 100 words)
    </button>
  );
}
