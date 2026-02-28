import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RichText from "@/components/rich-text";

export const dynamic = "force-dynamic";

function firstImageFromContent(content: string) {
  const md = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/i);
  if (md?.[1]) return md[1];
  const html = content.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (html?.[1]) return html[1];
  return null;
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

  const coverSrc = post.imageUrl || firstImageFromContent(post.content);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {validPreview && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Draft preview mode
        </div>
      )}
      <h1 className="text-4xl font-bold text-white">{post.title}</h1>
      <p className="mt-2 text-zinc-400">{new Date(post.createdAt).toLocaleDateString()}</p>
      {coverSrc && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-lg">
          <img src={coverSrc} alt={post.title} className="h-72 w-full object-cover md:h-96" />
        </div>
      )}
      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
        <RichText content={post.content} />
      </article>
    </main>
  );
}
