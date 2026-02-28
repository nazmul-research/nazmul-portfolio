"use client";

import { useState } from "react";

type Props = {
  content: string;
  light?: boolean;
};

function headingId(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function isOrderedItem(line: string) {
  return /^\d+\.\s+/.test(line);
}

function parseSingleImageLine(line: string) {
  const trimmed = line.trim();
  const md = trimmed.match(/^!\[(.*?)\]\(((?:https?:\/\/|\/|data:image\/)[^\s)]+)\)$/i);
  if (md) return { alt: md[1] || "inline image", src: md[2] };

  const html = trimmed.match(/^<img[^>]*src=["']([^"']+)["'][^>]*>$/i);
  if (html) {
    const alt = trimmed.match(/alt=["']([^"']*)["']/i)?.[1] || "inline image";
    return { alt, src: html[1] };
  }

  if (/^(https?:\/\/|\/).+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(trimmed)) {
    return { alt: "inline image", src: trimmed };
  }

  return null;
}

function renderTextWithInlineCodeAndLinks(text: string, keyPrefix: string) {
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={`${keyPrefix}-c-${i}`} className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.92em] text-zinc-100">
          {part.slice(1, -1)}
        </code>
      );
    }

    const out: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let j = 0;

    while ((m = regex.exec(part))) {
      if (m.index > last) out.push(<span key={`${keyPrefix}-t-${i}-${j++}`}>{part.slice(last, m.index)}</span>);
      const label = m[1] || m[3];
      const href = m[2] || m[3];
      out.push(
        <a key={`${keyPrefix}-a-${i}-${j++}`} href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 underline-offset-2 hover:text-sky-300">
          {label}
        </a>,
      );
      last = regex.lastIndex;
    }

    if (last < part.length) out.push(<span key={`${keyPrefix}-t-${i}-${j++}`}>{part.slice(last)}</span>);
    return out.length ? <span key={`${keyPrefix}-s-${i}`}>{out}</span> : <span key={`${keyPrefix}-t-${i}`}>{part}</span>;
  });
}

function renderInlineMarkdown(line: string, keyPrefix: string) {
  const mdRegex = /!\[(.*?)\]\(((?:https?:\/\/|\/|data:image\/)[^)\s]+)\)/gi;
  const htmlRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = mdRegex.exec(line))) {
    if (m.index > last) {
      parts.push(...renderTextWithInlineCodeAndLinks(line.slice(last, m.index), `${keyPrefix}-txt-${idx++}`));
    }
    parts.push(
      <figure key={`${keyPrefix}-i-${idx++}`} className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
        <img src={m[2]} alt={m[1] || "inline image"} className="w-full object-cover" loading="lazy" />
      </figure>,
    );
    last = mdRegex.lastIndex;
  }

  const remainder = line.slice(last);
  if (remainder) {
    let hLast = 0;
    let hm: RegExpExecArray | null;
    while ((hm = htmlRegex.exec(remainder))) {
      if (hm.index > hLast) {
        parts.push(...renderTextWithInlineCodeAndLinks(remainder.slice(hLast, hm.index), `${keyPrefix}-txt-${idx++}`));
      }
      parts.push(
        <figure key={`${keyPrefix}-i-${idx++}`} className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
          <img src={hm[1]} alt="inline image" className="w-full object-cover" loading="lazy" />
        </figure>,
      );
      hLast = htmlRegex.lastIndex;
    }
    if (hLast < remainder.length) {
      parts.push(...renderTextWithInlineCodeAndLinks(remainder.slice(hLast), `${keyPrefix}-txt-${idx++}`));
    }
  }

  return parts.length ? parts : renderTextWithInlineCodeAndLinks(line, `${keyPrefix}-plain`);
}

export default function RichText({ content, light = false }: Props) {
  const [copiedKey, setCopiedKey] = useState("");
  const lines = content.split(/\r?\n/);
  const headingClass = light ? "text-zinc-900" : "text-white";
  const bodyClass = light ? "text-zinc-700" : "text-zinc-200";
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.replace(/```/, "").trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) i += 1;
      const codeText = codeLines.join("\n");
      const codeLinesWithNo = codeText.split("\n").map((ln, n) => `${String(n + 1).padStart(2, " ")}  ${ln}`).join("\n");
      const codeKey = `code-${i}`;
      blocks.push(
        <div key={`code-wrap-${i}`} className="relative my-4">
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded border border-white/20 bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(codeText);
                setCopiedKey(codeKey);
                setTimeout(() => setCopiedKey(""), 1200);
              } catch {
                // ignore copy error
              }
            }}
          >
            {copiedKey === codeKey ? "Copied" : "Copy"}
          </button>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4">
            {lang ? <div className="mb-2 text-right text-[11px] uppercase tracking-wide text-zinc-400">{lang}</div> : null}
            <code className="font-mono text-sm text-zinc-100">{codeLinesWithNo}</code>
          </pre>
          {copiedKey === codeKey && <div className="mt-2 text-xs text-emerald-300">Copied to clipboard</div>}
        </div>,
      );
      continue;
    }

    const img = parseSingleImageLine(line);
    if (img) {
      blocks.push(
        <div key={`img-${i}`} className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <img src={img.src} alt={img.alt} className="w-full object-cover" />
        </div>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      const text = line.slice(4);
      blocks.push(<h3 id={headingId(text)} key={`h3-${i}`} className={`mt-5 scroll-mt-24 text-xl font-semibold ${headingClass}`}>{text}</h3>);
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3);
      blocks.push(<h2 id={headingId(text)} key={`h2-${i}`} className={`mt-6 scroll-mt-24 text-2xl font-semibold ${headingClass}`}>{text}</h2>);
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      const text = line.slice(2);
      blocks.push(<h1 id={headingId(text)} key={`h1-${i}`} className={`mt-6 scroll-mt-24 text-3xl font-bold ${headingClass}`}>{text}</h1>);
      i += 1;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!(t.startsWith("- ") || t.startsWith("* "))) break;
        items.push(t.slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className={`my-3 list-disc space-y-1 pl-6 ${bodyClass}`}>
          {items.map((it, idx) => (
            <li key={`${i}-${idx}`}>{renderTextWithInlineCodeAndLinks(it, `li-${i}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOrderedItem(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!isOrderedItem(t)) break;
        items.push(t.replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} className={`my-3 list-decimal space-y-1 pl-6 ${bodyClass}`}>
          {items.map((it, idx) => (
            <li key={`${i}-${idx}`}>{renderTextWithInlineCodeAndLinks(it, `oli-${i}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    blocks.push(
      <p key={`p-${i}`} className={`mt-3 whitespace-pre-wrap leading-7 ${bodyClass}`}>
        {renderInlineMarkdown(raw, `p-${i}`)}
      </p>,
    );
    i += 1;
  }

  return <div>{blocks}</div>;
}
