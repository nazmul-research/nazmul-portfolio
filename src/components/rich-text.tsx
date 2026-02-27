type Props = {
  content: string;
  light?: boolean;
};

function isOrderedItem(line: string) {
  return /^\d+\.\s+/.test(line);
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
        {raw}
      </p>,
    );
    i += 1;
  }

  return <div>{blocks}</div>;
}
