import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const publications = await prisma.publication.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { year: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main id="main-content" className="fade-up mx-auto max-w-5xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">Research</h1>
      <p className="mt-2 text-zinc-300">Selected publications and research contributions.</p>

      <div className="mt-8 space-y-4">
        {publications.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-zinc-300">No publications yet. Add them from CMS.</div>
        ) : (
          publications.map((p) => (
            <article key={p.id} className="glass-card rounded-3xl p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{p.year} • {p.venue}</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">{p.title}</h2>
              <p className="mt-2 text-sm text-zinc-300">{p.authors}</p>
              {p.excerpt && <p className="mt-3 text-sm leading-7 text-zinc-200">{p.excerpt}</p>}
              {p.url && (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-medium text-white underline">
                  Read publication
                </a>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
