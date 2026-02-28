"use client";

import { useMemo, useState } from "react";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function SlugHelper({ titleName, slugName, defaultTitle = "", defaultSlug = "", taken = [], titleInputId }: { titleName: string; slugName: string; defaultTitle?: string; defaultSlug?: string; taken?: string[]; titleInputId?: string }) {
  const [title, setTitle] = useState(defaultTitle);
  const [manualSlug, setManualSlug] = useState(defaultSlug);
  const [override, setOverride] = useState(Boolean(defaultSlug));

  const autoSlug = useMemo(() => slugify(title), [title]);
  const finalSlug = override ? slugify(manualSlug) : autoSlug;
  const duplicate = Boolean(finalSlug) && taken.includes(finalSlug) && finalSlug !== defaultSlug;

  return (
    <div className="space-y-2 md:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <label className="block text-xs font-medium text-zinc-600">Title</label>
      <input
        id={titleInputId}
        name={titleName}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border px-3 py-2"
        required
      />

      <div className="flex items-center gap-2 text-xs">
        <input id={`${slugName}-override`} type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
        <label htmlFor={`${slugName}-override`}>Manual slug override</label>
      </div>

      {override && (
        <input
          value={manualSlug}
          onChange={(e) => setManualSlug(e.target.value)}
          placeholder="custom-slug"
          className="w-full rounded-lg border px-3 py-2"
        />
      )}

      <p className="text-xs text-zinc-500">Final slug: <code>{finalSlug || "(empty)"}</code></p>
      {duplicate && <p className="text-xs text-amber-600">Warning: this slug already exists.</p>}
      <input type="hidden" name={slugName} value={finalSlug} />
    </div>
  );
}
