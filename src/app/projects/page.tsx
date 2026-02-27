import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const now = new Date();
  const projects = await prisma.project.findMany({
    where: { published: true, deletedAt: null, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return (
    <main id="main-content" className="fade-up mx-auto max-w-6xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">Projects</h1>
      <p className="mt-2 text-zinc-300">A selection of systems I designed and shipped.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {projects.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-zinc-300 md:col-span-2">No published projects yet. Add one from CMS.</div>
        ) : (
          projects.map((p) => (
            <article key={p.id} id={p.slug} className="tilt-card glass-card rounded-3xl p-6">
              {p.imageUrl && (
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  width={900}
                  height={360}
                  unoptimized
                  className="mb-4 h-44 w-full rounded-xl object-cover"
                />
              )}
              <h2 className="text-2xl font-semibold text-white">{p.title}</h2>
              <p className="mt-2 text-zinc-300">{p.summary}</p>
              {p.stack && <p className="mt-3 text-xs uppercase tracking-wide text-zinc-400">{p.stack}</p>}
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{p.content}</p>
              <div className="mt-5 flex gap-4 text-sm">
                {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline">Live Demo</a>}
                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline">Repo</a>}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
