import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { prisma } from "@/lib/prisma";

function SocialIcon({ kind }: { kind: "email" | "phone" | "whatsapp" | "linkedin" | "github" | "scholar" | "researchgate" }) {
  const d: Record<string, string> = {
    email: "M4 6h16v12H4z M4 7l8 6 8-6",
    phone: "M6 4h5l2 5-2 2a14 14 0 0 0 4 4l2-2 5 2v5c-8 1-15-6-16-16z",
    whatsapp: "M12 21a9 9 0 1 0-7.8-4.5L3 21l4.7-1.2A9 9 0 0 0 12 21zm-3.5-5.8c2.6 1.8 4.7 1.5 6.3 1 .5-.2 1.5-1.2 1.6-1.8.1-.4 0-.7-.3-.8l-2.1-1c-.3-.1-.5 0-.7.2l-.8 1c-.2.2-.4.2-.7.1-.8-.3-2.5-1.4-3.1-2.2-.2-.2-.2-.5 0-.7l.7-.8c.2-.2.3-.5.2-.8l-.9-2.2c-.1-.3-.4-.4-.8-.3-.6.1-1.6 1-1.8 1.5-.5 1.6.1 3.8 2.4 5.8z",
    linkedin: "M6 9h3v9H6zM7.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM11 9h2.8v1.3h.1c.4-.8 1.4-1.6 2.8-1.6 3 0 3.5 2 3.5 4.6V18h-3v-4c0-1 0-2.3-1.4-2.3s-1.6 1-1.6 2.2V18h-3z",
    github: "M12 3a9 9 0 0 0-2.8 17.6c.4.1.6-.2.6-.4v-1.5c-2.5.5-3-1-3-1-.4-1-.9-1.2-.9-1.2-.8-.5.1-.5.1-.5.9.1 1.4.9 1.4.9.8 1.4 2.2 1 2.7.8.1-.6.3-1 .6-1.2-2-.2-4-.9-4-4.2 0-1 .4-1.9.9-2.5-.1-.2-.4-1.1.1-2.4 0 0 .8-.2 2.5.9a8.6 8.6 0 0 1 4.5 0c1.7-1.1 2.5-.9 2.5-.9.5 1.3.2 2.2.1 2.4.6.6.9 1.5.9 2.5 0 3.3-2 4-4 4.2.3.3.6.8.6 1.6v2.3c0 .3.2.5.6.4A9 9 0 0 0 12 3z",
    scholar: "M12 4 3 9l9 5 7-3.9V16h2V9L12 4zm-5 8v3c0 2.2 10 2.2 10 0v-3l-5 2.8L7 12z",
    researchgate: "M5 4h8c3 0 5 2 5 5 0 2.3-1.1 3.8-3.1 4.5L19 20h-3.4l-3.6-6H8v6H5V4zm3 2v6h4c1.8 0 3-.9 3-3s-1.2-3-3-3H8z",
  };
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d[kind]} /></svg>;
}

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
  const mediaAssets = await prisma.mediaAsset.findMany({ where: { kind: "profile" }, orderBy: { createdAt: "desc" }, take: 24 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const socials = settings as unknown as {
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    whatsappUrl?: string | null;
    scholarUrl?: string | null;
    githubUrl2?: string | null;
    researchGateUrl?: string | null;
    cellNo?: string | null;
  };

  const stats = [
    [settings?.stat1Label ?? "Systems shipped", settings?.stat1Value ?? "10+", settings?.stat1Desc ?? "From prototype to production"],
    [settings?.stat2Label ?? "Focus", settings?.stat2Value ?? "AI + Robotics", settings?.stat2Desc ?? "Agent systems, automation, productization"],
    [settings?.stat3Label ?? "Collaboration", settings?.stat3Value ?? "Global", settings?.stat3Desc ?? "Remote-first execution"],
  ];
  const marquee = (settings?.marqueeItems || "⚡ Autonomous Agents|🤖 Robotics Workflow|🧠 AI Product Engineering|🔁 Automation Systems|📊 Reliability + Observability|🚀 Ship Fast, Scale Safely")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

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
    sameAs: [socials?.linkedinUrl, socials?.githubUrl, socials?.githubUrl2, socials?.whatsappUrl, socials?.scholarUrl, socials?.researchGateUrl].filter(Boolean),
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
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 md:grid-cols-[1.25fr_.75fr]">
          <div>
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-zinc-200">{settings?.availabilityTag ?? "Available for Biomedical + AI + Robotics projects"}</p>
            <h1 className="mt-4 display-font text-4xl font-extrabold tracking-tight text-white md:text-6xl">{settings?.fullName ?? "Nazmul Islam"}</h1>
            <p className="mt-3 text-lg text-zinc-200 md:text-2xl">{settings?.headline ?? "AI • Robotics • Agent Systems"}</p>
            <p className="mt-4 max-w-3xl text-zinc-300">{settings?.bio ?? "I build intelligent systems, practical software, and automation workflows that ship."}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/projects" className="glow-btn rounded-xl bg-white px-4 py-2 text-zinc-900 shadow-sm transition hover:-translate-y-0.5">View Projects</Link>
              <Link href="/blog" className="glow-btn rounded-xl border border-white/25 bg-white/5 px-4 py-2 text-white transition hover:bg-white/10">Read Blog</Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {settings?.email && <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="email" />Email</a>}
              {socials?.cellNo && <a href={`tel:${socials.cellNo.replace(/\s+/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="phone" />{socials.cellNo}</a>}
              {socials?.whatsappUrl && <a href={socials.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="whatsapp" />WhatsApp</a>}
              {socials?.linkedinUrl && <a href={socials.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="linkedin" />LinkedIn</a>}
              {socials?.githubUrl && <a href={socials.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="github" />GitHub 1</a>}
              {socials?.githubUrl2 && <a href={socials.githubUrl2} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="github" />GitHub 2</a>}
              {socials?.scholarUrl && <a href={socials.scholarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="scholar" />Google Scholar</a>}
              {socials?.researchGateUrl && <a href={socials.researchGateUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-zinc-200"><SocialIcon kind="researchgate" />ResearchGate</a>}
            </div>
          </div>

          <div className="mx-auto md:ml-auto">
            <div className="relative h-56 w-56 overflow-hidden rounded-full border-2 border-white/30 bg-white/5 p-2 shadow-[0_0_60px_rgba(99,102,241,0.35)]">
              {(mediaAssets.length > 0 || settings?.avatarUrl) ? (
                <>
                  {mediaAssets.length > 0 ? (
                    mediaAssets.map((m, idx) => (
                      <Image
                        key={m.id}
                        src={m.url}
                        alt={`Profile ${idx + 1}`}
                        width={224}
                        height={224}
                        unoptimized
                        className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-full object-cover avatar-rotate"
                        style={{ animationDelay: `${idx * 3.2}s`, animationDuration: `${Math.max(6, mediaAssets.length * 3.2)}s` }}
                      />
                    ))
                  ) : (
                    <Image
                      src={settings!.avatarUrl!}
                      alt={settings?.fullName ?? "Profile photo"}
                      width={224}
                      height={224}
                      unoptimized
                      className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-full object-cover"
                    />
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white/5 text-xs text-zinc-300">Upload your photo in CMS → Site Settings</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="fade-up mt-10 grid gap-4 md:grid-cols-3">
        {stats.map(([k, v, s]) => (
          <div key={k} className="glass-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{k}</p>
            <p className="mt-1 text-2xl font-bold text-white">{v}</p>
            <p className="mt-1 text-sm text-zinc-300">{s}</p>
          </div>
        ))}
      </section>

      <section className="fade-up mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] py-3">
        <div className="auto-scroll-track whitespace-nowrap text-sm text-zinc-300">
          {marquee.concat(marquee).map((item, idx) => (
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
              <Link key={p.id} href={`/projects/${p.slug}`} className="group glass-card rounded-2xl p-5 transition hover:-translate-y-1 hover:bg-white/[0.05]">
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.title}
                    width={640}
                    height={256}
                    unoptimized
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
