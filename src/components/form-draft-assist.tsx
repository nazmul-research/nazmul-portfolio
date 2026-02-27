"use client";

import { useEffect } from "react";

type Props = {
  formId: string;
  storageKey: string;
};

export default function FormDraftAssist({ formId, storageKey }: Props) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const data = JSON.parse(raw) as Record<string, string>;
        Object.entries(data).forEach(([name, value]) => {
          const el = form.elements.namedItem(name);
          if (!el) return;

          if (el instanceof RadioNodeList) {
            for (const node of Array.from(el)) {
              const input = node as HTMLInputElement;
              if (input.type === "checkbox") input.checked = value === "on";
              else input.value = value;
            }
            return;
          }

          if (el instanceof HTMLInputElement) {
            if (el.type === "checkbox") el.checked = value === "on";
            else el.value = value;
          }

          if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
            el.value = value;
          }
        });
      } catch {
        // ignore malformed draft
      }
    }

    const handler = () => {
      const fd = new FormData(form);
      const out: Record<string, string> = {};
      for (const [key, val] of fd.entries()) {
        if (typeof val === "string") out[key] = val;
      }

      for (const element of Array.from(form.elements)) {
        if (element instanceof HTMLInputElement && element.type === "checkbox" && element.name) {
          out[element.name] = element.checked ? "on" : "off";
        }
      }

      localStorage.setItem(storageKey, JSON.stringify(out));
    };

    form.addEventListener("input", handler);
    form.addEventListener("change", handler);

    return () => {
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
    };
  }, [formId, storageKey]);

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span>Draft autosave enabled</span>
      <button
        type="button"
        className="underline"
        onClick={() => {
          localStorage.removeItem(storageKey);
        }}
      >
        Clear draft
      </button>
    </div>
  );
}
