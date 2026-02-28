import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CoverSlider from "@/components/cover-slider";

export const dynamic = "force-dynamic";

function parseCoverImages(coverImages: string | null | undefined, imageUrl: string | null | undefined) {
  let arr: string[] = [];
  try {
    const parsed = JSON.parse(coverImages || "[]");
    if (Array.isArray(parsed)) arr = parsed.filter((x) => typeof x === "string");
  } catch {
    arr = [];
  }
  if (imageUrl && !arr.includes(imageUrl)) arr.unshift(imageUrl);
  return arr;
}

function readTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const category = typeof sp.category === "string" ? sp.category : "all";
  const year = typeof sp.year === "string" ? sp.year : "all";
  const month = typeof sp.month === "string" ? sp.month : "all";

  const now = new Date();
  const where: Record<string, unknown> = {
    published: true,
    deletedAt: null,
    OR: [{ publishAt: null }, { publishAt: { lte: now } }],
  };

  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { writerName: { contains: q } },
        ],
      },
    ];
  }

  if (category !== "all") {
    const and = Array.isArray(where.AND) ? where.AND : [];
    and.push({ category });
    where.AND = and;
  }

  if (year !== "all") {
    const y = Number(year);
    if (!Number.isNaN(y)) {
      const start = new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1);
      const and = Array.isArray(where.AND) ? where.AND : [];
      and.push({ createdAt: { gte: start, lt: end } });
      where.AND = and;
    }
  }

  if (month !== "all") {
    const m = Number(month);
    const y = year !== "all" ? Number(year) : now.getFullYear();
    if (!Number.isNaN(m) && m >= 1 && m <= 12 && !Number.isNaN(y)) {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const and = Array.isArray(where.AND) ? where.AND : [];
      and.push({ createdAt: { gte: start, lt: end } });
      where.AND = and;
    }
  }

  const [posts, allPublished] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.post.findMany({
      where: { published: true, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const years = Array.from(new Set(allPublished.map((p) => p.createdAt.getFullYear())));
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <main id="main-content" className="fade-up mx-auto max-w-5xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">Writing</h1>
      <p className="mt-2 text-zinc-300">Personal updates, technical rabbit holes, and practical reflections from a life happily entangled with code, circuits, and the occasional existential chat with a machine.</p>

      <form className="mt-6 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <input name="q" defaultValue={q} placeholder="Search by title, writer, excerpt..." className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white" />
        <select name="category" defaultValue={category} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white">
          <option value="all">All categories</option>
          <option value="technical">Technical</option>
          <option value="personal">Personal</option>
        </select>
        <select name="year" defaultValue={year} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white">
          <option value="all">All years</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select name="month" defaultValue={month} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white">
          <option value="all">All months</option>
          {monthNames.map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className="btn-primary">Filter</button>
          <Link href="/blog" className="btn-secondary">Reset</Link>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        {posts.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-zinc-300">No posts match this filter.</div>
        ) : (
          posts.map((b) => {
            const covers = parseCoverImages(b.coverImages, b.imageUrl);
            return (
              <Link key={b.id} href={`/blog/${b.slug}`} className="group block glass-card rounded-3xl p-4 transition hover:bg-white/[0.05]">
                <div className="grid gap-4 md:grid-cols-[280px_1fr] md:items-start">
                  <div>
                    {covers.length > 0 ? (
                      <CoverSlider images={covers} alt={b.title} imageClassName="h-40 w-full object-cover md:h-44" />
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-xs text-zinc-500">No image</div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">{b.category === "personal" ? "Personal" : "Technical"}</span>
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">Writer: {b.writerName || "Nazmul"}</span>
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">{readTime(b.content)} min read</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-white group-hover:text-sky-200">{b.title}</h2>
                    <p className="excerpt-fade mt-2 min-h-[4.25rem] text-zinc-300">{b.excerpt}</p>
                    <p className="mt-3 text-xs text-zinc-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
