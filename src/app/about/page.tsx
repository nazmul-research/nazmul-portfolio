import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const summary = (settings as unknown as { aboutBlock1?: string } | null)?.aboutBlock1 || "Share your summary from About CMS.";
  const careerExperience = (settings as unknown as { aboutBlock2?: string } | null)?.aboutBlock2 || "Add your career experience from About CMS.";
  const educationExperience = (settings as unknown as { aboutBlock3?: string } | null)?.aboutBlock3 || "Add your education experience from About CMS.";
  const cvUrl = (settings as unknown as { cvUrl?: string } | null)?.cvUrl;

  return (
    <main id="main-content" className="fade-up mx-auto max-w-5xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">About</h1>
      <p className="mt-2 text-zinc-300">A little more about me, my path, and what I’m building.</p>

      <div className="mt-8 grid gap-4">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-2 text-xl font-semibold text-white">Summary</h2>
          <p className="leading-8 text-zinc-200">{summary}</p>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-2 text-xl font-semibold text-white">Career Experience</h2>
          <p className="leading-8 text-zinc-200">{careerExperience}</p>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="mb-2 text-xl font-semibold text-white">Education Experience</h2>
          <p className="leading-8 text-zinc-200">{educationExperience}</p>
        </section>
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
