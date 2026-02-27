"use client";

import { useMemo, useState } from "react";

type Item = { id: string; label: string };

export default function ReorderList({ items, inputName }: { items: Item[]; inputName: string }) {
  const [list, setList] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);

  const serialized = useMemo(() => JSON.stringify(list.map((x) => x.id)), [list]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={inputName} value={serialized} />
      {list.map((item) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (!dragId || dragId === item.id) return;
            const a = list.findIndex((x) => x.id === dragId);
            const b = list.findIndex((x) => x.id === item.id);
            if (a < 0 || b < 0) return;
            const next = [...list];
            const [moved] = next.splice(a, 1);
            next.splice(b, 0, moved);
            setList(next);
          }}
          className="cursor-move rounded border bg-white px-3 py-2 text-sm"
          title="Drag to reorder"
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
