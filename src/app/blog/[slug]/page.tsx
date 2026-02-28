import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RichText from "@/components/rich-text";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {validPreview && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Draft preview mode
        </div>
      )}
      <h1 className="text-4xl font-bold text-white">{post.title}</h1>
      <p className="mt-2 text-zinc-400">{new Date(post.createdAt).toLocaleDateString()}</p>
      {post.imageUrl && (
        <Image src={post.imageUrl} alt={post.title} width={1200} height={520} unoptimized className="mt-6 h-64 w-full rounded-2xl object-cover" />
      )}
      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
        <RichText content={post.content} />
      </article>
    </main>
  );
}
