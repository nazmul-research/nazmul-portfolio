type Props = {
  content: string;
  light?: boolean;
};

function isOrderedItem(line: string) {
  return /^\d+\.\s+/.test(line);
}

function parseSingleImageLine(line: string) {
  const m = line.trim().match(/^!\[(.*?)\]\(((?:https?:\/\/|\/|data:image\/)[^\s)]+)\)$/i);
  if (!m) return null;
  return { alt: m[1] || "inline image", src: m[2] };
}

function renderInlineMarkdown(line: string, keyPrefix: string) {
  const regex = /!\[(.*?)\]\(((?:https?:\/\/|\/|data:image\/)[^)\s]+)\)/gi;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = regex.exec(line))) {
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
    last = regex.lastIndex;
  }

  if (last < line.length) {
    parts.push(<span key={`${keyPrefix}-t-${idx++}`}>{line.slice(last)}</span>);
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
      blocks.push(<h3 key={`h3-${i}`} className={`mt-5 text-xl font-semibold ${headingClass}`}>{line.slice(4)}</h3>);
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(<h2 key={`h2-${i}`} className={`mt-6 text-2xl font-semibold ${headingClass}`}>{line.slice(3)}</h2>);
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(<h1 key={`h1-${i}`} className={`mt-6 text-3xl font-bold ${headingClass}`}>{line.slice(2)}</h1>);
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
