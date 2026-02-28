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

export default async function BlogPage() {
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: { published: true, deletedAt: null, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main id="main-content" className="fade-up mx-auto max-w-5xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">Writing</h1>
      <p className="mt-2 text-zinc-300">Thoughts on AI systems, robotics, and practical engineering.</p>

      <div className="mt-8 grid gap-5">
        {posts.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-zinc-300">No published posts yet. First article coming soon.</div>
        ) : (
          posts.map((b) => {
            const covers = parseCoverImages(b.coverImages, b.imageUrl);
            return (
              <Link key={b.id} href={`/blog/${b.slug}`} className="group block glass-card rounded-3xl p-4 transition hover:bg-white/[0.05]">
                {covers.length > 0 && (
                  <div className="mb-4">
                    <CoverSlider images={covers} alt={b.title} imageClassName="h-44 w-full object-cover md:h-56" />
                  </div>
                )}

                <div className="px-1 pb-1">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">{b.category === "personal" ? "Personal" : "Technical"}</span>
                    <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">Writer: {b.writerName || "Nazmul"}</span>
                    <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-zinc-200">{readTime(b.content)} min read</span>
                  </div>

                  <h2 className="text-2xl font-semibold text-white group-hover:text-sky-200">{b.title}</h2>
                  <p className="excerpt-fade mt-2 min-h-[4.25rem] text-zinc-300">{b.excerpt}</p>
                  <p className="mt-3 text-xs text-zinc-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
