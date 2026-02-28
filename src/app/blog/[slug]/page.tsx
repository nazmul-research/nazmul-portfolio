import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RichText from "@/components/rich-text";
import CoverSlider from "@/components/cover-slider";
import ReadingProgress from "@/components/reading-progress";

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

function firstImageFromContent(content: string) {
  const md = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/i);
  if (md?.[1]) return md[1];
  const html = content.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (html?.[1]) return html[1];
  return null;
}

function headingToId(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function extractHeadings(content: string) {
  const lines = content.split(/\r?\n/);
  const headings: { level: number; text: string; id: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const text = m[2].trim();
    headings.push({ level: m[1].length, text, id: headingToId(text) });
  }
  return headings;
}

function readTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const preview = typeof sp.preview === "string" ? sp.preview : "";

  const now = new Date();
  const post = await prisma.post.findUnique({ where: { slug } });
  const validPreview = preview && preview === (process.env.DRAFT_PREVIEW_TOKEN || "preview-dev-token");
  if (!post || (!validPreview && (!post.published || post.deletedAt || (post.publishAt && post.publishAt > now)))) notFound();

  const fallbackCover = post.imageUrl || firstImageFromContent(post.content);
  const coverImages = parseCoverImages(post.coverImages, fallbackCover);
  const headings = extractHeadings(post.content);

  const [previous, next, related] = await Promise.all([
    prisma.post.findFirst({
      where: { published: true, deletedAt: null, createdAt: { lt: post.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.post.findFirst({
      where: { published: true, deletedAt: null, createdAt: { gt: post.createdAt } },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true },
    }),
    prisma.post.findMany({
      where: { published: true, deletedAt: null, category: "technical", id: { not: post.id } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { slug: true, title: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10" id="main-content">
      <ReadingProgress />
      {validPreview && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Draft preview mode
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_250px]">
        <article>
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-xl">
            {coverImages.length > 0 && (
              <CoverSlider
                images={coverImages}
                alt={post.title}
                imageClassName="h-[300px] w-full object-cover md:h-[420px] lg:h-[480px] scale-[1.03]"
                overlay={<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-200">{post.category === "personal" ? "Personal" : "Technical"} • {readTime(post.content)} min read</p>
              <h1 className="text-3xl font-bold text-white md:text-5xl">{post.title}</h1>
              <p className="mt-2 text-sm text-zinc-200">{post.writerName || "Nazmul"} • {new Date(post.createdAt).toLocaleDateString()}</p>
            </div>
          </section>

          <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
            <RichText content={post.content} />
          </article>

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>{previous ? <Link href={`/blog/${previous.slug}`} className="block rounded-xl border border-white/10 p-3 hover:bg-white/[0.04]"><p className="text-xs text-zinc-400">Previous post</p><p className="text-sm text-white">{previous.title}</p></Link> : null}</div>
              <div>{next ? <Link href={`/blog/${next.slug}`} className="block rounded-xl border border-white/10 p-3 hover:bg-white/[0.04]"><p className="text-xs text-zinc-400">Next post</p><p className="text-sm text-white">{next.title}</p></Link> : null}</div>
            </div>

            {related.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">More in Technical</p>
                <div className="grid gap-2">
                  {related.map((r) => (
                    <Link key={r.slug} href={`/blog/${r.slug}`} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.04]">
                      {r.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <Link href="/blog" className="block rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 hover:bg-white/[0.06]">← Back to Writing</Link>
            {headings.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">On this page</p>
                <div className="space-y-1">
                  {headings.map((h) => (
                    <a key={h.id} href={`#${h.id}`} className={`block text-sm text-zinc-200 hover:text-white ${h.level === 3 ? "pl-3" : ""}`}>
                      {h.text}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
