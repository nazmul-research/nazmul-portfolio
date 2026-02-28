import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const block1 = (settings as unknown as { aboutBlock1?: string } | null)?.aboutBlock1 || "Share your story here from About CMS.";
  const block2 = (settings as unknown as { aboutBlock2?: string } | null)?.aboutBlock2 || "Add your experience, interests, and journey.";
  const block3 = (settings as unknown as { aboutBlock3?: string } | null)?.aboutBlock3 || "Write what you are building and where you are heading.";
  const cvUrl = (settings as unknown as { cvUrl?: string } | null)?.cvUrl;

  return (
    <main id="main-content" className="fade-up mx-auto max-w-5xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">About</h1>
      <p className="mt-2 text-zinc-300">A little more about me, my work, and what I care about.</p>

      <div className="mt-8 grid gap-4">
        <section className="glass-card rounded-3xl p-6"><p className="leading-8 text-zinc-200">{block1}</p></section>
        <section className="glass-card rounded-3xl p-6"><p className="leading-8 text-zinc-200">{block2}</p></section>
        <section className="glass-card rounded-3xl p-6"><p className="leading-8 text-zinc-200">{block3}</p></section>
      </div>

      <div className="mt-8">
        {cvUrl ? (
          <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="glow-btn rounded-xl bg-white px-4 py-2 text-zinc-900">
            Download CV
          </a>
        ) : (
          <p className="text-sm text-zinc-400">Upload CV from About CMS to enable download button.</p>
        )}
      </div>
    </main>
  );
}
