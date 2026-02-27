"use client";

import { useState } from "react";

export default function BioField({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);

  return (
    <div className="md:col-span-2 space-y-2">
      <textarea
        name="bio"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Bio"
        className="min-h-24 w-full rounded-lg border px-3 py-2"
        required
      />
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => setValue(initial)}>
          Reset bio
        </button>
        <span className="text-xs text-zinc-500 self-center">Restores original saved bio text.</span>
      </div>
    </div>
  );
}
