"use client";

import { useRef, useState } from "react";

export default function ImportBackup() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function runImport(apply: boolean) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMsg("Choose a backup JSON first.");
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      const raw = await file.text();
      const payload = JSON.parse(raw);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: !apply, payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      const s = data.summary || {};
      const line = `site:${s.siteSettings || 0}, projects:${s.projects || 0}, posts:${s.posts || 0}, publications:${s.publications || 0}`;
      setMsg(apply ? `Import complete (${line})` : `Dry run OK (${line})`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={fileRef} type="file" accept="application/json" className="hidden" />
      <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>Choose backup</button>
      <button type="button" className="btn-secondary" onClick={() => void runImport(false)} disabled={busy}>Dry run</button>
      <button type="button" className="btn-primary" onClick={() => void runImport(true)} disabled={busy}>Import Backup</button>
      {msg && <span className="text-xs text-zinc-600">{msg}</span>}
    </div>
  );
}
