import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function upsertProject(data) {
  await prisma.project.upsert({ where: { slug: data.slug }, update: data, create: data });
}

async function upsertPost(data) {
  await prisma.post.upsert({ where: { slug: data.slug }, update: data, create: data });
}

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      fullName: 'Nazmul Islam',
      headline: 'AI • Robotics • Agent Systems Engineer',
      bio: 'I build practical AI systems, automation workflows, and product experiences that convert research into real outcomes.',
      location: 'New York, USA',
      email: 'nazmul@example.com',
      linkedinUrl: 'https://www.linkedin.com/in/nazmul87/',
      githubUrl: 'https://mdnazmulislam0087.github.io/'
    }
  });

  await upsertProject({
    title: 'LunaCart CMS Commerce',
    slug: 'lunacart-cms',
    summary: 'Full-stack ecommerce with admin CMS, orders, coupons, and analytics.',
    content: 'Built with Next.js, Prisma, and Stripe-ready flows. Includes admin actions, legal pages, and automation.',
    stack: 'Next.js, Prisma, SQLite, NextAuth',
    published: true,
    featured: true,
  });

  await upsertProject({
    title: 'OPM Research Digest Automation',
    slug: 'opm-research-digest',
    summary: 'Automated daily pipeline for OPM paper discovery and research-gap summaries.',
    content: 'Designed cron-based research assistant with concise technical summaries and action-oriented gap analysis.',
    stack: 'Automation, Research Ops, Telegram',
    published: true,
    featured: true,
  });

  await upsertPost({
    title: 'How to Make AI Agents Actually Useful in Production',
    slug: 'ai-agents-production-useful',
    excerpt: 'A practical checklist for reliability, observability, and value delivery.',
    content: 'Most AI agents fail in production because they optimize demos instead of operations. Start with scoped tasks, measurable outcomes, and clear escalation paths.',
    tags: 'AI Agents, Production, Engineering',
    published: true,
  });

  const ownerEmail = process.env.ADMIN_EMAIL || 'admin@nazmul.dev';
  const ownerPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: ownerEmail.toLowerCase() },
    update: { name: 'Owner', role: 'owner', active: true, password: ownerPasswordHash, passwordUpdatedAt: new Date() },
    create: { email: ownerEmail.toLowerCase(), password: ownerPasswordHash, passwordUpdatedAt: new Date(), name: 'Owner', role: 'owner', active: true },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
