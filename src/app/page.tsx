import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const now = new Date();
  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const projects = await prisma.project.findMany({
    where: { published: true, featured: true, deletedAt: null, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
    take: 3,
    orderBy: [{ featuredOrder: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  const posts = await prisma.post.findMany({
    where: { published: true, deletedAt: null, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
    take: 3,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings?.fullName ?? "Nazmul Islam",
    jobTitle: settings?.headline ?? "AI • Robotics • Agent Systems Engineer",
    description:
      settings?.bio ??
      "I build practical AI systems, automation workflows, and product experiences that convert research into real outcomes.",
    url: siteUrl,
    email: settings?.email ? `mailto:${settings.email}` : undefined,
    sameAs: [settings?.linkedinUrl, settings?.githubUrl].filter(Boolean),
    knowsAbout: ["Artificial Intelligence", "Robotics", "Agent Systems", "Automation"],
  };

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-12">
      <Script
        id="person-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <section className="fade-up relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="grid items-center gap-8 md:grid-cols-[1.25fr_.75fr]">
          <div>
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-zinc-200">Available for AI + Robotics projects</p>
            <h1 className="mt-4 display-font text-4xl font-extrabold tracking-tight text-white md:text-6xl">{settings?.fullName ?? "Nazmul Islam"}</h1>
            <p className="mt-3 text-lg text-zinc-200 md:text-2xl">{settings?.headline ?? "AI • Robotics • Agent Systems"}</p>
            <p className="mt-4 max-w-3xl text-zinc-300">{settings?.bio ?? "I build intelligent systems, practical software, and automation workflows that ship."}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/projects" className="glow-btn rounded-xl bg-white px-4 py-2 text-zinc-900 shadow-sm transition hover:-translate-y-0.5">View Projects</Link>
              <Link href="/blog" className="glow-btn rounded-xl border border-white/25 bg-white/5 px-4 py-2 text-white transition hover:bg-white/10">Read Blog</Link>
              {settings?.linkedinUrl && <a href={settings.linkedinUrl} className="glow-btn rounded-xl border border-white/25 bg-white/5 px-4 py-2 text-white transition hover:bg-white/10" target="_blank" rel="noopener noreferrer">LinkedIn</a>}
              {settings?.githubUrl && <a href={settings.githubUrl} className="glow-btn rounded-xl border border-white/25 bg-white/5 px-4 py-2 text-white transition hover:bg-white/10" target="_blank" rel="noopener noreferrer">GitHub</a>}
            </div>
          </div>

          <div className="mx-auto md:ml-auto">
            <div className="relative h-56 w-56 rounded-full border-2 border-white/30 bg-white/5 p-2 shadow-[0_0_60px_rgba(99,102,241,0.35)]">
              {settings?.avatarUrl ? (
                <Image
                  src={settings.avatarUrl}
                  alt={settings?.fullName ?? "Profile photo"}
                  width={224}
                  height={224}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white/5 text-xs text-zinc-300">Upload your photo in CMS → Site Settings</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="fade-up mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Systems shipped", "10+", "From prototype to production"],
          ["Focus", "AI + Robotics", "Agent systems, automation, productization"],
          ["Collaboration", "Global", "Remote-first execution"],
        ].map(([k, v, s]) => (
          <div key={k} className="glass-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{k}</p>
            <p className="mt-1 text-2xl font-bold text-white">{v}</p>
            <p className="mt-1 text-sm text-zinc-300">{s}</p>
          </div>
        ))}
      </section>

      <section className="fade-up mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] py-3">
        <div className="auto-scroll-track whitespace-nowrap text-sm text-zinc-300">
          {[
            "⚡ Autonomous Agents",
            "🤖 Robotics Workflow",
            "🧠 AI Product Engineering",
            "🔁 Automation Systems",
            "📊 Reliability + Observability",
            "🚀 Ship Fast, Scale Safely",
          ].concat([
            "⚡ Autonomous Agents",
            "🤖 Robotics Workflow",
            "🧠 AI Product Engineering",
            "🔁 Automation Systems",
            "📊 Reliability + Observability",
            "🚀 Ship Fast, Scale Safely",
          ]).map((item, idx) => (
            <span key={idx} className="mx-4 inline-block">{item}</span>
          ))}
        </div>
      </section>

      <section className="fade-up mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="title-underline text-2xl font-semibold text-white">Featured Projects</h2>
          <Link href="/projects" className="text-sm text-zinc-400 hover:text-white">See all</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {projects.length === 0 ? (
            <div className="glass-card rounded-2xl p-5 text-zinc-300 md:col-span-3">Projects are being curated. Check back soon.</div>
          ) : (
            projects.map((p) => (
              <Link key={p.id} href={`/projects#${p.slug}`} className="group glass-card rounded-2xl p-5 transition hover:-translate-y-1 hover:bg-white/[0.05]">
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.title}
                    width={640}
                    height={256}
                    className="mb-3 h-32 w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="font-semibold text-white group-hover:text-zinc-100">{p.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{p.summary}</p>
                {p.stack && <p className="mt-3 text-xs text-zinc-400">{p.stack}</p>}
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="fade-up mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="title-underline text-2xl font-semibold text-white">Recent Writing</h2>
          <Link href="/blog" className="text-sm text-zinc-400 hover:text-white">See all</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.length === 0 ? (
            <div className="glass-card rounded-2xl p-5 text-zinc-300 md:col-span-3">No posts yet. Fresh writing coming soon.</div>
          ) : (
            posts.map((b) => (
              <Link key={b.id} href={`/blog/${b.slug}`} className="tilt-card glass-card rounded-2xl p-5 transition hover:bg-white/[0.05]">
                <h3 className="font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{b.excerpt}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="fade-up mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <h2 className="text-2xl font-semibold text-white">How I work</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["1. Discover", "Clarify problem, constraints, and success metrics."],
            ["2. Build", "Rapid prototyping with production-minded architecture."],
            ["3. Iterate", "Measure, improve, and scale what works."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-black/20 p-4">
              <p className="font-medium text-white">{t}</p>
              <p className="mt-1 text-sm text-zinc-300">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="fade-up mt-12 rounded-3xl border border-white/15 bg-gradient-to-r from-indigo-500/20 to-sky-500/20 p-8 text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <h2 className="text-2xl font-semibold">Let’s build something great.</h2>
        <p className="mt-2 text-zinc-200">Open to product consulting, automation systems, and AI-first engineering work.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {settings?.email && <a href={`mailto:${settings.email}`} className="glow-btn rounded-xl bg-white px-4 py-2 text-zinc-900">Email Me</a>}
          {settings?.linkedinUrl && <a href={settings.linkedinUrl} className="rounded-xl border border-white/40 bg-white/5 px-4 py-2" target="_blank" rel="noopener noreferrer">LinkedIn</a>}
        </div>
      </section>
    </main>
  );
}
