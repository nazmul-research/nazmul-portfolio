import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function BlogPage() {
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: { published: true, deletedAt: null, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return (
    <main id="main-content" className="fade-up mx-auto max-w-4xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">Writing</h1>
      <p className="mt-2 text-zinc-300">Thoughts on AI systems, robotics, and practical engineering.</p>

      <div className="mt-8 space-y-4">
        {posts.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-zinc-300">No published posts yet. First article coming soon.</div>
        ) : (
          posts.map((b) => (
            <Link key={b.id} href={`/blog/${b.slug}`} className="block glass-card rounded-3xl p-6 transition hover:bg-white/[0.05]">
              {b.imageUrl && (
                <Image src={b.imageUrl} alt={b.title} width={900} height={340} unoptimized className="mb-4 h-40 w-full rounded-xl object-cover" />
              )}
              <h2 className="text-2xl font-semibold text-white">{b.title}</h2>
              <p className="mt-2 text-zinc-300">{b.excerpt}</p>
              <p className="mt-3 text-xs text-zinc-400">{new Date(b.createdAt).toLocaleDateString()}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
