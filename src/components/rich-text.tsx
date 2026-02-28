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

function renderInlineMarkdown(line: string, keyPrefix: string) {
  const mdRegex = /!\[(.*?)\]\(((?:https?:\/\/|\/|data:image\/)[^)\s]+)\)/gi;
  const htmlRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = mdRegex.exec(line))) {
    if (m.index > last) {
      parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{line.slice(last, m.index)}</span>);
    }
    parts.push(
      <figure key={`${keyPrefix}-i-${idx++}`} className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
        <img
          src={m[2]}
          alt={m[1] || "inline image"}
          className="w-full object-cover"
          loading="lazy"
        />
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
        parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{remainder.slice(hLast, hm.index)}</span>);
      }
      parts.push(
        <figure key={`${keyPrefix}-i-${idx++}`} className="my-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
          <img src={hm[1]} alt="inline image" className="w-full object-cover" loading="lazy" />
        </figure>,
      );
      hLast = htmlRegex.lastIndex;
    }
    if (hLast < remainder.length) {
      parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{remainder.slice(hLast)}</span>);
    }
  }

  return parts.length ? parts : line;
}

export default function RichText({ content, light = false }: Props) {
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
            <li key={`${i}-${idx}`}>{it}</li>
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
            <li key={`${i}-${idx}`}>{it}</li>
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
