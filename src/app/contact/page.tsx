import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ContactItem = { label: string; value: string; href?: string; icon: string };

function toHref(label: string, value: string) {
  const v = value.trim();
  const l = label.toLowerCase();
  if (!v) return undefined;
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("mailto:") || v.startsWith("tel:")) return v;
  if (l.includes("email")) return `mailto:${v}`;
  if (l.includes("phone") || l.includes("mobile")) return `tel:${v.replace(/\s+/g, "")}`;
  if (l.includes("whatsapp")) return v.startsWith("+") ? `https://wa.me/${v.replace(/[^\d]/g, "")}` : `https://wa.me/${v.replace(/[^\d]/g, "")}`;
  if (v.includes(".")) return `https://${v}`;
  return undefined;
}

function iconFor(label: string, value: string) {
  const t = `${label} ${value}`.toLowerCase();
  if (t.includes("email")) return "✉️";
  if (t.includes("phone") || t.includes("mobile")) return "📞";
  if (t.includes("whatsapp")) return "💬";
  if (t.includes("linkedin")) return "🔗";
  if (t.includes("github")) return "💻";
  if (t.includes("researchgate")) return "🧪";
  if (t.includes("scholar")) return "🎓";
  if (t.includes("address") || t.includes("location")) return "📍";
  return "•";
}

function parseContact(raw: string | null | undefined, fallback: Record<string, string | null | undefined>) {
  const lines = String(raw || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ContactItem[] = [];

  if (lines.length > 0) {
    for (const line of lines) {
      const m = line.match(/^([^:]+):\s*(.+)$/);
      const label = (m?.[1] || "Contact").trim();
      const value = (m?.[2] || line).trim();
      items.push({ label, value, href: toHref(label, value), icon: iconFor(label, value) });
    }
    return items;
  }

  const map: Array<[string, string | null | undefined]> = [
    ["Email", fallback.email],
    ["WhatsApp", fallback.whatsappUrl],
    ["LinkedIn", fallback.linkedinUrl],
    ["GitHub", fallback.githubUrl],
    ["GitHub (Alt)", fallback.githubUrl2],
    ["Google Scholar", fallback.scholarUrl],
    ["ResearchGate", fallback.researchGateUrl],
  ];

  for (const [label, value] of map) {
    if (!value) continue;
    items.push({ label, value, href: toHref(label, value), icon: iconFor(label, value) });
  }

  return items;
}

export default async function ContactPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const items = parseContact((settings as unknown as { contactRaw?: string } | null)?.contactRaw, {
    email: settings?.email,
    whatsappUrl: (settings as unknown as { whatsappUrl?: string } | null)?.whatsappUrl,
    linkedinUrl: settings?.linkedinUrl,
    githubUrl: settings?.githubUrl,
    githubUrl2: (settings as unknown as { githubUrl2?: string } | null)?.githubUrl2,
    scholarUrl: (settings as unknown as { scholarUrl?: string } | null)?.scholarUrl,
    researchGateUrl: (settings as unknown as { researchGateUrl?: string } | null)?.researchGateUrl,
  });

  return (
    <main id="main-content" className="fade-up mx-auto max-w-4xl px-6 py-12">
      <h1 className="display-font title-underline text-4xl font-extrabold tracking-tight text-white">Contact</h1>
      <p className="mt-2 text-zinc-300">Reach out for collaborations, projects, and research conversations.</p>

      <div className="mt-8 space-y-3">
        {items.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-zinc-300">No contact entries yet. Add from CMS → Site → Contact Section.</div>
        ) : (
          items.map((item, i) => (
            <div key={`${item.label}-${i}`} className="glass-card rounded-2xl p-4">
              <p className="text-sm font-semibold text-white">{item.icon} {item.label}</p>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-zinc-200 underline underline-offset-2 hover:text-white">
                  {item.value}
                </a>
              ) : (
                <p className="mt-1 text-zinc-200">{item.value}</p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
