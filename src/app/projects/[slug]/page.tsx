import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CoverSlider from "@/components/cover-slider";

export const dynamic = "force-dynamic";

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

export default async function ProjectDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const now = new Date();
  const project = await prisma.project.findUnique({ where: { slug } });

  if (!project || !project.published || project.deletedAt || (project.publishAt && project.publishAt > now)) notFound();

  const images = parseProjectImages(project.projectImages, project.imageUrl);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/projects" className="rounded border border-white/15 bg-white/5 px-3 py-1 text-sm text-zinc-100 hover:bg-white/10">← Back to Projects</Link>

      <h1 className="mt-5 text-4xl font-bold text-white">{project.title}</h1>
      {images.length > 0 && (
        <div className="mt-6">
          <CoverSlider images={images} alt={project.title} imageClassName="h-72 w-full object-cover md:h-96" />
        </div>
      )}

      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
        <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">{project.content}</p>
      </article>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-zinc-100 hover:bg-white/10">Live Demo</a>}
        {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-zinc-100 hover:bg-white/10">GitHub</a>}
      </div>
    </main>
  );
}
