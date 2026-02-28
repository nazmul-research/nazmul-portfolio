import { prisma } from "@/lib/prisma";
import CoverSlider from "@/components/cover-slider";

function parseProjectImages(projectImages: string | null | undefined, imageUrl: string | null | undefined) {
  let arr: string[] = [];
  try {
    const parsed = JSON.parse(projectImages || "[]");
    if (Array.isArray(parsed)) arr = parsed.filter((x) => typeof x === "string");
  } catch {
    arr = [];
  }
  if (imageUrl && !arr.includes(imageUrl)) arr.unshift(imageUrl);
  return arr;
}

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
              {parseProjectImages(p.projectImages, p.imageUrl).length > 0 && (
                <div className="mb-4">
                  <CoverSlider images={parseProjectImages(p.projectImages, p.imageUrl)} alt={p.title} imageClassName="h-44 w-full object-cover" />
                </div>
              )}
              <h2 className="text-2xl font-semibold text-white">{p.title}</h2>
              <p className="mt-2 text-zinc-300">{p.summary}</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200">{p.content}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-zinc-100 hover:bg-white/10">Live Demo</a>}
                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-zinc-100 hover:bg-white/10">GitHub</a>}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
