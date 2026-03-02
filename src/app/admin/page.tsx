import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/submit-button";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import ImageUploader from "@/components/image-uploader";
import LivePreviewTextarea from "@/components/live-preview-textarea";
import UrlImagePreview from "@/components/url-image-preview";
import MultiImageUploader from "@/components/multi-image-uploader";
import SlugHelper from "@/components/slug-helper";
import BioField from "@/components/bio-field";
import { AutoExcerptButton, AutoTagsButton } from "@/components/blog-meta-tools";
import WriterStatus from "@/components/writer-status";
import PublishChecklist from "@/components/publish-checklist";
import PublicationExcerptTool from "@/components/publication-excerpt-tool";
import ProjectExcerptTool from "@/components/project-excerpt-tool";
import CvUploader from "@/components/cv-uploader";
import { z } from "zod";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import { generateRecoveryCodes, hashRecoveryCodes } from "@/lib/recovery-codes";


type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const siteSettingsSchema = z.object({
  fullName: z.string().trim().min(2),
  headline: z.string().trim().min(3),
  availabilityTag: z.string().trim().optional().or(z.literal("")),
  stat1Label: z.string().trim().optional().or(z.literal("")),
  stat1Value: z.string().trim().optional().or(z.literal("")),
  stat1Desc: z.string().trim().optional().or(z.literal("")),
  stat2Label: z.string().trim().optional().or(z.literal("")),
  stat2Value: z.string().trim().optional().or(z.literal("")),
  stat2Desc: z.string().trim().optional().or(z.literal("")),
  stat3Label: z.string().trim().optional().or(z.literal("")),
  stat3Value: z.string().trim().optional().or(z.literal("")),
  stat3Desc: z.string().trim().optional().or(z.literal("")),
  marqueeItems: z.string().trim().optional().or(z.literal("")),
  bio: z.string().trim().min(10),
  location: z.string().trim().optional(),
  email: z.string().trim().optional().or(z.literal("")),
  mobileNo: z.string().trim().optional().or(z.literal("")),
  linkedinUrl: z.string().trim().optional().or(z.literal("")),
  githubUrl: z.string().trim().optional().or(z.literal("")),
  githubUrl2: z.string().trim().optional().or(z.literal("")),
  whatsappUrl: z.string().trim().optional().or(z.literal("")),
  scholarUrl: z.string().trim().optional().or(z.literal("")),
  researchGateUrl: z.string().trim().optional().or(z.literal("")),
  contactRaw: z.string().trim().optional().or(z.literal("")),
  aboutBlock1: z.string().trim().optional().or(z.literal("")),
  aboutBlock2: z.string().trim().optional().or(z.literal("")),
  aboutBlock3: z.string().trim().optional().or(z.literal("")),
  cvUrl: z.string().trim().optional().or(z.literal("")),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
});

const projectSchema = z.object({
  title: z.string().trim().min(2),
  excerpt: z.string().trim().optional().or(z.literal("")),
  details: z.string().trim().min(10),
  projectImages: z.string().trim().optional().or(z.literal("")),
  demoUrl: z.string().trim().optional().or(z.literal("")),
  repoUrl: z.string().trim().optional().or(z.literal("")),
  featured: z.boolean(),
  published: z.boolean(),
});

const postSchema = z.object({
  title: z.string().trim().min(2),
  writerName: z.string().trim().min(2),
  category: z.enum(["personal", "technical"]),
  excerpt: z.string().trim().min(10),
  content: z.string().trim().min(10),
  tags: z.string().trim().optional(),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  coverImages: z.string().trim().optional().or(z.literal("")),
  published: z.boolean(),
  publishAt: z.string().optional().or(z.literal("")),
});

const publicationSchema = z.object({
  title: z.string().trim().min(3),
  authors: z.string().trim().min(3),
  venue: z.string().trim().min(2),
  year: z.coerce.number().int().min(1900).max(2100),
  url: z.string().trim().optional().or(z.literal("")),
  abstract: z.string().trim().optional().or(z.literal("")),
  excerpt: z.string().trim().optional().or(z.literal("")),
  published: z.boolean(),
});

function cleanOptional(value: string | null | undefined) {
  const str = String(value || "").trim();
  return str || null;
}

function normalizeUrl(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("data:image/")) return raw;
  if (raw.startsWith("/")) return raw;

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!["http:", "https:", "data:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeEmail(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : null;
}

function normalizeWhatsApp(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return normalizeUrl(raw);
  }

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}


function normalizeImageArray(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => normalizeUrl(String(v || "")))
        .filter((v): v is string => Boolean(v));
    }
  } catch {
    // ignore and fallback
  }

  return raw
    .split(/[\n,]/)
    .map((s) => normalizeUrl(s.trim()))
    .filter((v): v is string => Boolean(v));
}

function normalizeDateTime(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asBool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function adminRedirect(status: string): never {
  redirect(`/admin?status=${status}`);
}

function blogRedirect(status: string, blogView: string): never {
  const safeView = ["create", "draft", "published", "trash"].includes(blogView) ? blogView : "create";
  redirect(`/admin?panel=blog&blogView=${safeView}&status=${status}`);
}

function projectRedirect(status: string): never {
  redirect(`/admin?panel=projects&status=${status}`);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

async function ensureUniquePostSlug(baseSlug: string, excludeId?: string) {
  let candidate = baseSlug;
  let i = 2;

  while (true) {
    const found = await prisma.post.findUnique({ where: { slug: candidate } });
    if (!found || (excludeId && found.id === excludeId)) return candidate;
    candidate = `${baseSlug}-${i}`;
    i += 1;
  }
}

function makeExcerptFromAbstract(abstract: string) {
  return abstract.trim().split(/\s+/).filter(Boolean).slice(0, 50).join(" ");
}

function extractFirstImageFromContent(content: string) {
  const md = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/i);
  if (md?.[1]) return md[1];

  const html = content.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (html?.[1]) return html[1];

  const plain = content.match(/(^|\n)((?:https?:\/\/|\/)[^\s]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?)(?=\n|$)/i);
  if (plain?.[2]) return plain[2];

  return null;
}

async function saveSettings(formData: FormData) {
  "use server";

  const parsed = siteSettingsSchema.safeParse({
    fullName: String(formData.get("fullName") || ""),
    headline: String(formData.get("headline") || ""),
    availabilityTag: String(formData.get("availabilityTag") || ""),
    stat1Label: String(formData.get("stat1Label") || ""),
    stat1Value: String(formData.get("stat1Value") || ""),
    stat1Desc: String(formData.get("stat1Desc") || ""),
    stat2Label: String(formData.get("stat2Label") || ""),
    stat2Value: String(formData.get("stat2Value") || ""),
    stat2Desc: String(formData.get("stat2Desc") || ""),
    stat3Label: String(formData.get("stat3Label") || ""),
    stat3Value: String(formData.get("stat3Value") || ""),
    stat3Desc: String(formData.get("stat3Desc") || ""),
    marqueeItems: String(formData.get("marqueeItems") || ""),
    bio: String(formData.get("bio") || ""),
    location: String(formData.get("location") || ""),
    email: String(formData.get("email") || ""),
    mobileNo: String(formData.get("mobileNo") || ""),
    linkedinUrl: String(formData.get("linkedinUrl") || ""),
    githubUrl: String(formData.get("githubUrl") || ""),
    githubUrl2: String(formData.get("githubUrl2") || ""),
    whatsappUrl: String(formData.get("whatsappUrl") || ""),
    scholarUrl: String(formData.get("scholarUrl") || ""),
    researchGateUrl: String(formData.get("researchGateUrl") || ""),
    contactRaw: String(formData.get("contactRaw") || ""),
    aboutBlock1: String(formData.get("aboutBlock1") || ""),
    aboutBlock2: String(formData.get("aboutBlock2") || ""),
    aboutBlock3: String(formData.get("aboutBlock3") || ""),
    cvUrl: String(formData.get("cvUrl") || ""),
    avatarUrl: String(formData.get("avatarUrl") || ""),
  });

  if (!parsed.success) adminRedirect("settings-invalid");

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {
      fullName: parsed.data.fullName,
      headline: parsed.data.headline,
      availabilityTag: cleanOptional(parsed.data.availabilityTag) ?? "Available for Biomedical + AI + Robotics projects",
      stat1Label: cleanOptional(parsed.data.stat1Label) ?? "Systems shipped",
      stat1Value: cleanOptional(parsed.data.stat1Value) ?? "10+",
      stat1Desc: cleanOptional(parsed.data.stat1Desc) ?? "From prototype to production",
      stat2Label: cleanOptional(parsed.data.stat2Label) ?? "Focus",
      stat2Value: cleanOptional(parsed.data.stat2Value) ?? "AI + Robotics",
      stat2Desc: cleanOptional(parsed.data.stat2Desc) ?? "Agent systems, automation, productization",
      stat3Label: cleanOptional(parsed.data.stat3Label) ?? "Collaboration",
      stat3Value: cleanOptional(parsed.data.stat3Value) ?? "Global",
      stat3Desc: cleanOptional(parsed.data.stat3Desc) ?? "Remote-first execution",
      marqueeItems: cleanOptional(parsed.data.marqueeItems) ?? "⚡ Autonomous Agents|🤖 Robotics Workflow|🧠 AI Product Engineering|🔁 Automation Systems|📊 Reliability + Observability|🚀 Ship Fast, Scale Safely",
      bio: parsed.data.bio,
      location: cleanOptional(parsed.data.location),
      email: normalizeEmail(parsed.data.email),
      cellNo: cleanOptional(parsed.data.mobileNo),
      linkedinUrl: normalizeUrl(parsed.data.linkedinUrl),
      githubUrl: normalizeUrl(parsed.data.githubUrl),
      githubUrl2: normalizeUrl(parsed.data.githubUrl2),
      whatsappUrl: normalizeWhatsApp(parsed.data.whatsappUrl),
      scholarUrl: normalizeUrl(parsed.data.scholarUrl),
      researchGateUrl: normalizeUrl(parsed.data.researchGateUrl),
      contactRaw: cleanOptional(parsed.data.contactRaw),
      aboutBlock1: cleanOptional(parsed.data.aboutBlock1),
      aboutBlock2: cleanOptional(parsed.data.aboutBlock2),
      aboutBlock3: cleanOptional(parsed.data.aboutBlock3),
      cvUrl: normalizeUrl(parsed.data.cvUrl),
      avatarUrl: normalizeUrl(parsed.data.avatarUrl),
    },
    create: {
      id: "main",
      fullName: parsed.data.fullName,
      headline: parsed.data.headline,
      availabilityTag: cleanOptional(parsed.data.availabilityTag) ?? "Available for Biomedical + AI + Robotics projects",
      stat1Label: cleanOptional(parsed.data.stat1Label) ?? "Systems shipped",
      stat1Value: cleanOptional(parsed.data.stat1Value) ?? "10+",
      stat1Desc: cleanOptional(parsed.data.stat1Desc) ?? "From prototype to production",
      stat2Label: cleanOptional(parsed.data.stat2Label) ?? "Focus",
      stat2Value: cleanOptional(parsed.data.stat2Value) ?? "AI + Robotics",
      stat2Desc: cleanOptional(parsed.data.stat2Desc) ?? "Agent systems, automation, productization",
      stat3Label: cleanOptional(parsed.data.stat3Label) ?? "Collaboration",
      stat3Value: cleanOptional(parsed.data.stat3Value) ?? "Global",
      stat3Desc: cleanOptional(parsed.data.stat3Desc) ?? "Remote-first execution",
      marqueeItems: cleanOptional(parsed.data.marqueeItems) ?? "⚡ Autonomous Agents|🤖 Robotics Workflow|🧠 AI Product Engineering|🔁 Automation Systems|📊 Reliability + Observability|🚀 Ship Fast, Scale Safely",
      bio: parsed.data.bio,
      location: cleanOptional(parsed.data.location),
      email: normalizeEmail(parsed.data.email),
      cellNo: cleanOptional(parsed.data.mobileNo),
      linkedinUrl: normalizeUrl(parsed.data.linkedinUrl),
      githubUrl: normalizeUrl(parsed.data.githubUrl),
      githubUrl2: normalizeUrl(parsed.data.githubUrl2),
      whatsappUrl: normalizeWhatsApp(parsed.data.whatsappUrl),
      scholarUrl: normalizeUrl(parsed.data.scholarUrl),
      researchGateUrl: normalizeUrl(parsed.data.researchGateUrl),
      contactRaw: cleanOptional(parsed.data.contactRaw),
      aboutBlock1: cleanOptional(parsed.data.aboutBlock1),
      aboutBlock2: cleanOptional(parsed.data.aboutBlock2),
      aboutBlock3: cleanOptional(parsed.data.aboutBlock3),
      cvUrl: normalizeUrl(parsed.data.cvUrl),
      avatarUrl: normalizeUrl(parsed.data.avatarUrl),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  await writeAuditLog({ action: "settings.update", targetType: "site", targetId: "main" });
  adminRedirect("settings-saved");
}

async function saveProfileAvatar(formData: FormData) {
  "use server";
  const avatarUrl = normalizeUrl(String(formData.get("avatarUrl") || ""));

  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: { avatarUrl },
    create: {
      id: "main",
      fullName: "Nazmul Islam",
      headline: "AI • Robotics • Agent Systems",
      bio: "I build intelligent systems, practical software, and automation workflows that ship.",
      avatarUrl,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  await writeAuditLog({ action: "settings.avatar.save", targetType: "site", targetId: "main" });
  adminRedirect("avatar-saved");
}

async function clearProfileAvatar() {
  "use server";
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: { avatarUrl: null },
    create: {
      id: "main",
      fullName: "Nazmul Islam",
      headline: "AI • Robotics • Agent Systems",
      bio: "I build intelligent systems, practical software, and automation workflows that ship.",
      avatarUrl: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  await writeAuditLog({ action: "settings.avatar.clear", targetType: "site", targetId: "main" });
  adminRedirect("avatar-cleared");
}


async function changeMyPassword(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("auth-required");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || newPassword.length < 8 || newPassword !== confirmPassword) {
    adminRedirect("password-invalid");
  }

  const me = await prisma.adminUser.findUnique({ where: { email } });
  if (!me) adminRedirect("admin-not-found");

  const ok = await verifyPassword(currentPassword, me.password);
  if (!ok) adminRedirect("password-current-invalid");

  const nextHash = await hashPassword(newPassword);
  await prisma.adminUser.update({
    where: { id: me.id },
    data: {
      password: nextHash,
      passwordUpdatedAt: new Date(),
      sessionVersion: { increment: 1 },
    },
  });

  await writeAuditLog({ action: "auth.password_change", targetType: "admin_user", targetId: me.id });
  adminRedirect("password-changed");
}

async function createProject(formData: FormData) {
  "use server";

  const parsed = projectSchema.safeParse({
    title: String(formData.get("title") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    details: String(formData.get("details") || ""),
    projectImages: String(formData.get("projectImages") || ""),
    demoUrl: String(formData.get("demoUrl") || ""),
    repoUrl: String(formData.get("repoUrl") || ""),
    featured: asBool(formData.get("featured")),
    published: asBool(formData.get("published")),
  });

  if (!parsed.success) projectRedirect("project-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  const slug = slugInput || `${slugify(parsed.data.title)}-${Math.floor(Math.random() * 9999)}`;

  const existingSlug = await prisma.project.findUnique({ where: { slug } });
  if (existingSlug) adminRedirect("slug-conflict");

  const projectImages = normalizeImageArray(parsed.data.projectImages);
  const details = parsed.data.details;
  const detailsWords = details.split(/\s+/).filter(Boolean);

  const maxFeatured = parsed.data.featured ? await prisma.project.aggregate({ _max: { featuredOrder: true } }) : null;
  const nextFeaturedOrder = parsed.data.featured ? ((maxFeatured?._max.featuredOrder ?? -1) + 1) : 0;

  await prisma.project.create({
    data: {
      title: parsed.data.title,
      slug,
      summary: cleanOptional(parsed.data.excerpt) || detailsWords.slice(0, 50).join(" "),
      content: details,
      imageUrl: projectImages[0] || null,
      projectImages: projectImages.length ? JSON.stringify(projectImages) : null,
      demoUrl: normalizeUrl(parsed.data.demoUrl),
      repoUrl: normalizeUrl(parsed.data.repoUrl),
      featured: parsed.data.featured,
      featuredOrder: nextFeaturedOrder,
      published: parsed.data.published,
      publishAt: null,
      deletedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.create", targetType: "project", targetId: slug });
  projectRedirect("project-added");
}

async function updateProject(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  if (!id) projectRedirect("project-update-failed");

  const parsed = projectSchema.safeParse({
    title: String(formData.get("title") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    details: String(formData.get("details") || ""),
    projectImages: String(formData.get("projectImages") || ""),
    demoUrl: String(formData.get("demoUrl") || ""),
    repoUrl: String(formData.get("repoUrl") || ""),
    featured: asBool(formData.get("featured")),
    published: asBool(formData.get("published")),
  });

  if (!parsed.success) projectRedirect("project-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  if (slugInput) {
    const existingSlug = await prisma.project.findUnique({ where: { slug: slugInput } });
    if (existingSlug && existingSlug.id !== id) adminRedirect("slug-conflict");
  }

  const projectImages = normalizeImageArray(parsed.data.projectImages);
  const details = parsed.data.details;
  const detailsWords = details.split(/\s+/).filter(Boolean);

  const existingProject = await prisma.project.findUnique({ where: { id } });
  const maxFeatured = parsed.data.featured && !existingProject?.featured ? await prisma.project.aggregate({ _max: { featuredOrder: true } }) : null;
  const nextFeaturedOrder = parsed.data.featured
    ? (existingProject?.featured ? (existingProject.featuredOrder ?? 0) : ((maxFeatured?._max.featuredOrder ?? -1) + 1))
    : 0;

  await prisma.project.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: slugInput || undefined,
      summary: cleanOptional(parsed.data.excerpt) || detailsWords.slice(0, 50).join(" "),
      content: details,
      imageUrl: projectImages[0] || null,
      projectImages: projectImages.length ? JSON.stringify(projectImages) : null,
      demoUrl: normalizeUrl(parsed.data.demoUrl),
      repoUrl: normalizeUrl(parsed.data.repoUrl),
      featured: parsed.data.featured,
      featuredOrder: nextFeaturedOrder,
      published: parsed.data.published,
      publishAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.update", targetType: "project", targetId: id });
  projectRedirect("project-updated");
}

async function deleteProject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) projectRedirect("project-delete-failed");

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.trash", targetType: "project", targetId: id });
  projectRedirect("project-trashed");
}

async function restoreProject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) projectRedirect("project-restore-failed");

  await prisma.project.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.restore", targetType: "project", targetId: id });
  projectRedirect("project-restored");
}

async function hardDeleteProject(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  const id = String(formData.get("id") || "").trim();
  if (!id) projectRedirect("project-delete-failed");

  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.delete", targetType: "project", targetId: id });
  projectRedirect("project-deleted");
}

async function createPost(formData: FormData) {
  "use server";

  const publishRequested = String(formData.get("published") || "false") === "true";
  const parsed = postSchema.safeParse({
    title: String(formData.get("title") || ""),
    writerName: String(formData.get("writerName") || ""),
    category: String(formData.get("category") || "technical"),
    excerpt: String(formData.get("excerpt") || ""),
    content: String(formData.get("content") || ""),
    tags: String(formData.get("tags") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    coverImages: String(formData.get("coverImages") || ""),
    published: publishRequested,
    publishAt: String(formData.get("publishAt") || ""),
  });

  if (!parsed.success) adminRedirect("post-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  const slugBase = slugInput || slugify(parsed.data.title) || `post-${Math.floor(Math.random() * 9999)}`;
  const slug = await ensureUniquePostSlug(slugBase);

  const inferredImage = normalizeUrl(extractFirstImageFromContent(parsed.data.content));
  const explicitImage = normalizeUrl(parsed.data.imageUrl);
  const coverImages = normalizeImageArray(parsed.data.coverImages);

  await prisma.post.create({
    data: {
      title: parsed.data.title,
      slug,
      writerName: parsed.data.writerName,
      category: parsed.data.category,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      tags: cleanOptional(parsed.data.tags),
      imageUrl: explicitImage || inferredImage || coverImages[0] || null,
      coverImages: coverImages.length ? JSON.stringify(coverImages) : null,
      published: parsed.data.published,
      publishAt: normalizeDateTime(parsed.data.publishAt),
      deletedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.create", targetType: "post", targetId: slug });
  blogRedirect("post-added", publishRequested ? "published" : "draft");
}

async function updatePost(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("post-update-failed");

  const publishRequested = String(formData.get("published") || "false") === "true";
  const parsed = postSchema.safeParse({
    title: String(formData.get("title") || ""),
    writerName: String(formData.get("writerName") || ""),
    category: String(formData.get("category") || "technical"),
    excerpt: String(formData.get("excerpt") || ""),
    content: String(formData.get("content") || ""),
    tags: String(formData.get("tags") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    coverImages: String(formData.get("coverImages") || ""),
    published: publishRequested,
    publishAt: String(formData.get("publishAt") || ""),
  });

  if (!parsed.success) adminRedirect("post-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  const nextSlug = slugInput ? await ensureUniquePostSlug(slugInput, id) : undefined;

  const inferredImage = normalizeUrl(extractFirstImageFromContent(parsed.data.content));
  const explicitImage = normalizeUrl(parsed.data.imageUrl);
  const coverImages = normalizeImageArray(parsed.data.coverImages);

  await prisma.post.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: nextSlug,
      writerName: parsed.data.writerName,
      category: parsed.data.category,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      tags: cleanOptional(parsed.data.tags),
      imageUrl: explicitImage || inferredImage || coverImages[0] || null,
      coverImages: coverImages.length ? JSON.stringify(coverImages) : null,
      published: parsed.data.published,
      publishAt: normalizeDateTime(parsed.data.publishAt),
    },
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.update", targetType: "post", targetId: id });
  blogRedirect("post-updated", publishRequested ? "published" : "draft");
}

async function createPostPublish(formData: FormData) {
  "use server";
  formData.set("published", "true");
  await createPost(formData);
}

async function createPostDraft(formData: FormData) {
  "use server";
  formData.set("published", "false");
  await createPost(formData);
}

async function updatePostPublish(formData: FormData) {
  "use server";
  formData.set("published", "true");
  await updatePost(formData);
}

async function updatePostDraft(formData: FormData) {
  "use server";
  formData.set("published", "false");
  await updatePost(formData);
}

async function deletePost(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  const fromView = String(formData.get("fromView") || "draft");
  if (!id) blogRedirect("post-delete-failed", fromView);

  await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.trash", targetType: "post", targetId: id });
  blogRedirect("post-trashed", "trash");
}

async function restorePost(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) blogRedirect("post-restore-failed", "trash");

  await prisma.post.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.restore", targetType: "post", targetId: id });
  blogRedirect("post-restored", "draft");
}

async function hardDeletePost(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") blogRedirect("admin-forbidden", "trash");

  const id = String(formData.get("id") || "").trim();
  if (!id) blogRedirect("post-delete-failed", "trash");

  await prisma.post.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.delete", targetType: "post", targetId: id });
  blogRedirect("post-deleted", "trash");
}

async function deleteMediaAsset(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("media-delete-failed");

  await prisma.mediaAsset.delete({ where: { id } });
  revalidatePath("/admin");
  await writeAuditLog({ action: "media.delete", targetType: "media", targetId: id });
  adminRedirect("media-deleted");
}


async function createPublication(formData: FormData) {
  "use server";

  const parsed = publicationSchema.safeParse({
    title: String(formData.get("title") || ""),
    authors: String(formData.get("authors") || ""),
    venue: String(formData.get("venue") || ""),
    year: String(formData.get("year") || ""),
    url: String(formData.get("url") || ""),
    abstract: String(formData.get("abstract") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    published: asBool(formData.get("published")),
  });

  if (!parsed.success) adminRedirect("publication-invalid");

  const normalizedAbstract = cleanOptional(parsed.data.abstract);
  const normalizedExcerpt = cleanOptional(parsed.data.excerpt) || (normalizedAbstract ? makeExcerptFromAbstract(normalizedAbstract) : null);

  await prisma.publication.create({
    data: {
      title: parsed.data.title,
      authors: parsed.data.authors,
      venue: parsed.data.venue,
      year: parsed.data.year,
      url: normalizeUrl(parsed.data.url),
      abstract: normalizedAbstract,
      excerpt: normalizedExcerpt,
      published: parsed.data.published,
    },
  });

  revalidatePath("/research");
  revalidatePath("/admin");
  await writeAuditLog({ action: "publication.create", targetType: "publication", targetId: parsed.data.title });
  redirect("/admin?panel=research&status=publication-added");
}

async function updatePublication(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("publication-invalid");

  const parsed = publicationSchema.safeParse({
    title: String(formData.get("title") || ""),
    authors: String(formData.get("authors") || ""),
    venue: String(formData.get("venue") || ""),
    year: String(formData.get("year") || ""),
    url: String(formData.get("url") || ""),
    abstract: String(formData.get("abstract") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    published: asBool(formData.get("published")),
  });

  if (!parsed.success) adminRedirect("publication-invalid");

  const normalizedAbstract = cleanOptional(parsed.data.abstract);
  const normalizedExcerpt = cleanOptional(parsed.data.excerpt) || (normalizedAbstract ? makeExcerptFromAbstract(normalizedAbstract) : null);

  await prisma.publication.update({
    where: { id },
    data: {
      title: parsed.data.title,
      authors: parsed.data.authors,
      venue: parsed.data.venue,
      year: parsed.data.year,
      url: normalizeUrl(parsed.data.url),
      abstract: normalizedAbstract,
      excerpt: normalizedExcerpt,
      published: parsed.data.published,
    },
  });

  revalidatePath("/research");
  revalidatePath("/admin");
  await writeAuditLog({ action: "publication.update", targetType: "publication", targetId: id });
  redirect("/admin?panel=research&status=publication-updated");
}

async function deletePublication(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("publication-delete-failed");

  await prisma.publication.delete({ where: { id } });
  revalidatePath("/research");
  revalidatePath("/admin");
  await writeAuditLog({ action: "publication.delete", targetType: "publication", targetId: id });
  redirect("/admin?panel=research&status=publication-deleted");
}


async function createAdminUser(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const nextRoleRaw = String(formData.get("role") || "editor").trim().toLowerCase();
  const nextRole = nextRoleRaw === "owner" ? "owner" : "editor";

  if (!name || !email || password.length < 8) adminRedirect("admin-user-invalid");

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) adminRedirect("admin-user-invalid");

  const hashed = await hashPassword(password);
  await prisma.adminUser.create({
    data: {
      name,
      email,
      password: hashed,
      role: nextRole,
      active: true,
    },
  });

  revalidatePath("/admin");
  await writeAuditLog({ action: "admin_user.create", targetType: "admin_user", targetId: email });
  adminRedirect("admin-user-saved");
}

async function toggleAdminUserActive(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  const id = String(formData.get("id") || "").trim();
  const active = String(formData.get("active") || "true") === "true";
  if (!id) adminRedirect("admin-user-invalid");

  await prisma.adminUser.update({ where: { id }, data: { active: !active, sessionVersion: { increment: 1 } } });
  revalidatePath("/admin");
  await writeAuditLog({ action: active ? "admin_user.deactivate" : "admin_user.activate", targetType: "admin_user", targetId: id });
  adminRedirect(active ? "admin-user-deactivated" : "admin-user-activated");
}

async function enableMyTotp(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("auth-required");

  const token = String(formData.get("token") || "").trim();
  const totpSecret = String(formData.get("totpSecret") || "").trim();
  if (!token || !totpSecret) adminRedirect("totp-invalid");

  const ok = authenticator.verify({ token, secret: totpSecret });
  if (!ok) adminRedirect("totp-invalid");

  const recoveryCodes = generateRecoveryCodes();
  await prisma.adminUser.update({
    where: { email },
    data: {
      totpEnabled: true,
      totpSecret,
      recoveryCodesHash: hashRecoveryCodes(recoveryCodes),
    },
  });

  revalidatePath("/admin");
  await writeAuditLog({ action: "totp.enable", targetType: "admin_user", targetId: email });
  adminRedirect("totp-enabled");
}

async function disableMyTotp() {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("auth-required");

  await prisma.adminUser.update({ where: { email }, data: { totpEnabled: false, totpSecret: null, recoveryCodesHash: null } });
  revalidatePath("/admin");
  await writeAuditLog({ action: "totp.disable", targetType: "admin_user", targetId: email });
  adminRedirect("totp-disabled");
}

async function regenerateRecoveryCodes() {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("auth-required");

  const recoveryCodes = generateRecoveryCodes();
  await prisma.adminUser.update({ where: { email }, data: { recoveryCodesHash: hashRecoveryCodes(recoveryCodes) } });
  revalidatePath("/admin");
  await writeAuditLog({ action: "totp.recovery.regenerate", targetType: "admin_user", targetId: email });
  adminRedirect("recovery-codes-regenerated");
}

async function forceLogoutMySessions() {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("auth-required");

  await prisma.adminUser.update({ where: { email }, data: { sessionVersion: { increment: 1 } } });
  revalidatePath("/admin");
  await writeAuditLog({ action: "sessions.revoke.self", targetType: "admin_user", targetId: email });
  adminRedirect("sessions-revoked");
}

async function forceLogoutAllAdminSessions() {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  await prisma.adminUser.updateMany({ data: { sessionVersion: { increment: 1 } } });
  revalidatePath("/admin");
  await writeAuditLog({ action: "sessions.revoke.all", targetType: "admin_user", targetId: "all" });
  adminRedirect("sessions-revoked-all");
}

const statusText: Record<string, string> = {
  "settings-saved": "✅ Settings saved",
  "settings-invalid": "⚠️ Settings invalid. Check required fields and URL/email format.",
  "project-added": "✅ Project added",
  "project-updated": "✅ Project updated",
  "project-published": "✅ Project published",
  "project-unpublished": "✅ Project moved to draft",
  "project-trashed": "🗑️ Project moved to trash",
  "project-restored": "♻️ Project restored",
  "project-deleted": "✅ Project permanently deleted",
  "project-reordered": "✅ Featured order updated",
  "project-invalid": "⚠️ Project form invalid. Fill title, summary, and content properly.",
  "post-added": "✅ Post added",
  "post-updated": "✅ Post updated",
  "post-published": "✅ Post published",
  "post-unpublished": "✅ Post moved to draft",
  "post-trashed": "🗑️ Post moved to trash",
  "post-restored": "♻️ Post restored",
  "post-deleted": "✅ Post permanently deleted",
  "post-invalid": "⚠️ Post form invalid. Fill title, excerpt, and content properly.",
  "admin-user-saved": "✅ Admin user saved",
  "admin-user-activated": "✅ Admin user activated",
  "admin-user-deactivated": "✅ Admin user deactivated",
  "admin-user-invalid": "⚠️ Admin user form invalid",
  "admin-forbidden": "⛔ Only owner can manage admin users",
  "password-changed": "✅ Password updated",
  "password-invalid": "⚠️ Password change failed (check current password / minimum 8 chars)",
  "totp-enabled": "✅ 2FA enabled",
  "totp-disabled": "✅ 2FA disabled",
  "totp-invalid": "⚠️ Invalid 2FA token/password",
  "recovery-codes-regenerated": "✅ Recovery codes regenerated",
  "sessions-revoked": "✅ Your sessions were revoked. Please re-login on other devices.",
  "sessions-revoked-all": "✅ All admin sessions revoked",
  "slug-conflict": "⚠️ Slug already exists. Choose a unique slug.",
  "media-deleted": "✅ Media deleted",
  "media-delete-failed": "⚠️ Media delete failed",
  "avatar-saved": "✅ Profile avatar saved",
  "avatar-cleared": "✅ Profile avatar cleared",
  "publication-added": "✅ Publication added",
  "publication-deleted": "✅ Publication deleted",
  "publication-updated": "✅ Publication updated",
  "publication-invalid": "⚠️ Publication form invalid",
  "publication-delete-failed": "⚠️ Could not delete publication", 
};

function badgeTone(published: boolean) {
  return published
    ? "border-emerald-300/40 bg-emerald-100 text-emerald-700"
    : "border-amber-300/40 bg-amber-100 text-amber-700";
}

function NavIcon({ kind }: { kind: "site" | "about" | "projects" | "research" | "blog" | "users" | "security" | "audit" }) {
  const paths: Record<string, string> = {
    site: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
    projects: "M4 6h7v7H4zM13 6h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z",
    blog: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 4h10M7 12h10M7 16h6",
    research: "M4 5h16v14H4zM8 3v4M16 3v4M7 10h10M7 14h6",
    about: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 17a7 7 0 0 1 14 0",
    users: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 20a6 6 0 0 1 16 0",
    security: "M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6zM9 12l2 2 4-4",
    audit: "M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1v3h3",
  };

  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[kind]} />
    </svg>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/admin/login");
  const sessionData = session.user as Record<string, unknown> | undefined;
  const rawRole = sessionData?.role;
  const sessionRole = typeof rawRole === "string" ? rawRole : "editor";
  const mustRotatePassword = Boolean(sessionData?.passwordExpired);

  const resolvedParams = (await searchParams) ?? {};
  const status = typeof resolvedParams.status === "string" ? resolvedParams.status : "";
  const codesParam = typeof resolvedParams.codes === "string" ? resolvedParams.codes : "";
  let revealCodes: string[] = [];
  if (codesParam) {
    try {
      revealCodes = JSON.parse(Buffer.from(decodeURIComponent(codesParam), "base64").toString("utf8")) as string[];
    } catch {
      revealCodes = [];
    }
  }

  const q = typeof resolvedParams.q === "string" ? resolvedParams.q.trim() : "";
  const filter = typeof resolvedParams.filter === "string" ? resolvedParams.filter : "all";
  const scope = typeof resolvedParams.scope === "string" ? resolvedParams.scope : "active";
  const panel = typeof resolvedParams.panel === "string" ? resolvedParams.panel : "site";
  const editProjectId = typeof resolvedParams.editProjectId === "string" ? resolvedParams.editProjectId : "";
  const editPublicationId = typeof resolvedParams.editPublicationId === "string" ? resolvedParams.editPublicationId : "";
  const rawBlogView = typeof resolvedParams.blogView === "string" ? resolvedParams.blogView : "create";
  const blogView = ["create", "draft", "published", "trash"].includes(rawBlogView) ? rawBlogView : "create";
  const editId = typeof resolvedParams.editId === "string" ? resolvedParams.editId : "";

  if (mustRotatePassword) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10 text-zinc-900" id="main-content">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-white">Security Required</h1>
          <form action="/api/auth/signout" method="post">
            <button className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">Sign out</button>
          </form>
        </header>

        <div className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900">
          Your password is older than 90 days. Change it now to continue using admin controls.
        </div>

        {status && statusText[status] && (
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-100 px-4 py-3 text-sm text-emerald-900">{statusText[status]}</div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Change Password</h2>
          <form action={changeMyPassword} className="grid gap-3 md:grid-cols-3">
            <input type="password" name="currentPassword" placeholder="Current password" className="rounded-lg border px-3 py-2" required />
            <input type="password" name="newPassword" placeholder="New password (min 8 chars)" className="rounded-lg border px-3 py-2" required />
            <input type="password" name="confirmPassword" placeholder="Confirm new password" className="rounded-lg border px-3 py-2" required />
            <SubmitButton idleText="Change Password" pendingText="Updating..." className="btn-primary w-fit disabled:opacity-60 md:col-span-3" />
          </form>
        </section>
      </main>
    );
  }

  const projectWhere = {
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { stack: { contains: q } },
          ],
        }
      : {}),
    ...(scope === "trash" ? { deletedAt: { not: null } } : { deletedAt: null }),
    ...(filter === "published" ? { published: true } : {}),
    ...(filter === "draft" ? { published: false } : {}),
  };

  const now = new Date();
  const trashRetainFrom = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  await prisma.post.deleteMany({ where: { deletedAt: { not: null, lt: trashRetainFrom } } });

  const postWhere = {
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {}),
    ...(
      panel === "blog"
        ? blogView === "trash"
          ? { deletedAt: { not: null, gte: trashRetainFrom } }
          : { deletedAt: null }
        : scope === "trash"
          ? { deletedAt: { not: null } }
          : { deletedAt: null }
    ),
    ...(panel === "blog"
      ? blogView === "published"
        ? { published: true }
        : blogView === "draft"
          ? { published: false }
          : {}
      : filter === "published"
        ? { published: true }
        : filter === "draft"
          ? { published: false }
          : {}),
  };

  const [settings, projects, posts, publications, adminUsers, auditLogs, me, mediaAssets, draftCount, publishedCount, trashCount] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "main" } }),
    prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.post.findMany({ where: postWhere, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.publication.findMany({ orderBy: [{ year: "desc" }, { createdAt: "desc" }], take: 200 }),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.adminUser.findUnique({ where: { email: session.user?.email?.toLowerCase() || "" } }),
    prisma.mediaAsset.findMany({ where: { kind: "profile" }, orderBy: { createdAt: "desc" }, take: 24 }),
    prisma.post.count({ where: { deletedAt: null, published: false } }),
    prisma.post.count({ where: { deletedAt: null, published: true } }),
    prisma.post.count({ where: { deletedAt: { not: null, gte: trashRetainFrom } } }),
  ]);

  const editProject = panel === "projects" && editProjectId
    ? await prisma.project.findFirst({ where: { id: editProjectId, deletedAt: null } })
    : null;

  const editPublication = panel === "research" && editPublicationId
    ? await prisma.publication.findFirst({ where: { id: editPublicationId } })
    : null;

  const editPost = panel === "blog" && editId
    ? await prisma.post.findFirst({ where: { id: editId, deletedAt: null } })
    : null;

  const setupTotpSecret = me && !me.totpEnabled ? authenticator.generateSecret() : null;
  const setupTotpUri = setupTotpSecret
    ? authenticator.keyuri(me?.email || "admin@nazmul.dev", "Nazmul Portfolio CMS", setupTotpSecret)
    : null;
  const setupTotpQr = setupTotpUri ? await QRCode.toDataURL(setupTotpUri) : null;

  const projectSlugs = projects.map((p) => p.slug);
  const postSlugs = posts.map((p) => p.slug);
  const previewToken = process.env.DRAFT_PREVIEW_TOKEN || "preview-dev-token";


  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10 text-zinc-900" id="main-content">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio CMS Admin</h1>
          <p className="text-sm text-zinc-300">Control content, publish workflow, and homepage visibility from one place.</p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="btn-secondary">Sign out</button>
        </form>
      </header>

      {status && statusText[status] && !(panel === "blog" && ["post-added", "post-updated", "post-trashed", "post-restored", "post-deleted"].includes(status)) && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-100 px-4 py-3 text-sm text-emerald-900 shadow-sm">{statusText[status]}</div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-all duration-300">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <a href="/admin?panel=site" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "site" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="site" />Site</a>
          <a href="/admin?panel=projects" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "projects" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="projects" />Projects</a>
          <a href="/admin?panel=about" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "about" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="about" />About</a>
          <a href="/admin?panel=blog" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "blog" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="blog" />Blog</a>
          <a href="/admin?panel=research" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "research" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="research" />Research</a>
          <a href="/admin?panel=users" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "users" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="users" />Users</a>
          <a href="/admin?panel=security" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "security" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="security" />Security</a>
          <a href="/admin?panel=audit" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "audit" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="audit" />Audit</a>
        </div>
        <aside className="pointer-events-none fixed right-5 top-24 z-20 hidden xl:block">
          <div className="pointer-events-auto rounded-xl border border-zinc-200 bg-white/95 p-2 shadow">
            <div className="mb-1 px-2 text-[11px] font-semibold text-zinc-500">Quick nav</div>
            <div className="flex flex-col text-xs">
              <a href="/admin?panel=site" className="rounded px-2 py-1 hover:bg-zinc-100">Site</a>
              <a href="/admin?panel=projects" className="rounded px-2 py-1 hover:bg-zinc-100">Projects</a>
              <a href="/admin?panel=blog" className="rounded px-2 py-1 hover:bg-zinc-100">Blog</a>
              <a href="/admin?panel=users" className="rounded px-2 py-1 hover:bg-zinc-100">Users</a>
              <a href="/admin?panel=security" className="rounded px-2 py-1 hover:bg-zinc-100">Security</a>
              <a href="/admin?panel=audit" className="rounded px-2 py-1 hover:bg-zinc-100">Audit</a>
            </div>
          </div>
        </aside>
        
      {panel === "projects" && (
          <form className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
            <input type="hidden" name="panel" value={panel} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search projects..."
              className="rounded-lg border px-3 py-2"
            />
            <select name="scope" defaultValue={scope} className="rounded-lg border px-3 py-2">
              <option value="active">Active</option>
              <option value="trash">Trash</option>
            </select>
            <select name="filter" defaultValue={filter} className="rounded-lg border px-3 py-2">
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <button className="btn-primary">Apply</button>
            <a href={`/admin?panel=${panel}`} className="btn-secondary text-center">Reset</a>
          </form>
        )}
      </section>

      {panel === "site" && (
      <section id="site-settings" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">Site Settings</h2>
        <p className="mb-4 text-sm text-zinc-500">Required: full name, headline, bio. Optional links must be valid URLs.</p>
        <form action={saveSettings} className="grid gap-3 md:grid-cols-2">
          <details className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">First Section</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input name="fullName" defaultValue={settings?.fullName ?? "Nazmul Islam"} placeholder="Full name" className="rounded-lg border px-3 py-2" required />
              <input name="headline" defaultValue={settings?.headline ?? "AI • Robotics • Agent Systems"} placeholder="Headline" className="rounded-lg border px-3 py-2" required />
              <input name="availabilityTag" defaultValue={(settings as unknown as { availabilityTag?: string })?.availabilityTag ?? "Available for Biomedical + AI + Robotics projects"} placeholder="Availability tag" className="rounded-lg border px-3 py-2" />
              <input name="location" defaultValue={settings?.location ?? ""} placeholder="Location" className="rounded-lg border px-3 py-2" />

              <input type="email" name="email" defaultValue={settings?.email ?? ""} placeholder="Email" className="rounded-lg border px-3 py-2" />
              <input name="mobileNo" defaultValue={(settings as unknown as { cellNo?: string })?.cellNo ?? ""} placeholder="Mobile no" className="rounded-lg border px-3 py-2" />
              <input type="url" name="linkedinUrl" defaultValue={settings?.linkedinUrl ?? "https://www.linkedin.com/in/nazmul87/"} placeholder="LinkedIn URL" className="rounded-lg border px-3 py-2" />
              <input type="url" name="githubUrl" defaultValue={settings?.githubUrl ?? "https://github.com/mdnazmulislam0087"} placeholder="GitHub URL" className="rounded-lg border px-3 py-2" />
              <input type="url" name="githubUrl2" defaultValue={(settings as unknown as { githubUrl2?: string })?.githubUrl2 ?? ""} placeholder="Second GitHub URL" className="rounded-lg border px-3 py-2" />
              <input type="url" name="whatsappUrl" defaultValue={(settings as unknown as { whatsappUrl?: string })?.whatsappUrl ?? "https://wa.me/"} placeholder="WhatsApp URL" className="rounded-lg border px-3 py-2" />
              <input type="url" name="scholarUrl" defaultValue={(settings as unknown as { scholarUrl?: string })?.scholarUrl ?? "https://scholar.google.com/"} placeholder="Google Scholar URL" className="rounded-lg border px-3 py-2" />
              <input type="url" name="researchGateUrl" defaultValue={(settings as unknown as { researchGateUrl?: string })?.researchGateUrl ?? "https://www.researchgate.net/"} placeholder="ResearchGate URL" className="rounded-lg border px-3 py-2 md:col-span-2" />

              <BioField initial={settings?.bio ?? ""} />
              <div className="md:col-span-2">
                <SubmitButton idleText="Save Settings" pendingText="Saving..." className="btn-primary w-fit disabled:opacity-60" />
              </div>
            </div>
          </details>

          <details className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">Second Section</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input name="stat1Label" defaultValue={(settings as unknown as { stat1Label?: string })?.stat1Label ?? "Systems shipped"} placeholder="Card 1 label" className="rounded-lg border px-3 py-2" />
              <input name="stat1Value" defaultValue={(settings as unknown as { stat1Value?: string })?.stat1Value ?? "10+"} placeholder="Card 1 value" className="rounded-lg border px-3 py-2" />
              <input name="stat1Desc" defaultValue={(settings as unknown as { stat1Desc?: string })?.stat1Desc ?? "From prototype to production"} placeholder="Card 1 description" className="rounded-lg border px-3 py-2" />

              <input name="stat2Label" defaultValue={(settings as unknown as { stat2Label?: string })?.stat2Label ?? "Focus"} placeholder="Card 2 label" className="rounded-lg border px-3 py-2" />
              <input name="stat2Value" defaultValue={(settings as unknown as { stat2Value?: string })?.stat2Value ?? "AI + Robotics"} placeholder="Card 2 value" className="rounded-lg border px-3 py-2" />
              <input name="stat2Desc" defaultValue={(settings as unknown as { stat2Desc?: string })?.stat2Desc ?? "Agent systems, automation, productization"} placeholder="Card 2 description" className="rounded-lg border px-3 py-2" />

              <input name="stat3Label" defaultValue={(settings as unknown as { stat3Label?: string })?.stat3Label ?? "Collaboration"} placeholder="Card 3 label" className="rounded-lg border px-3 py-2" />
              <input name="stat3Value" defaultValue={(settings as unknown as { stat3Value?: string })?.stat3Value ?? "Global"} placeholder="Card 3 value" className="rounded-lg border px-3 py-2" />
              <input name="stat3Desc" defaultValue={(settings as unknown as { stat3Desc?: string })?.stat3Desc ?? "Remote-first execution"} placeholder="Card 3 description" className="rounded-lg border px-3 py-2" />

              <input name="marqueeItems" defaultValue={(settings as unknown as { marqueeItems?: string })?.marqueeItems ?? "⚡ Autonomous Agents|🤖 Robotics Workflow|🧠 AI Product Engineering|🔁 Automation Systems|📊 Reliability + Observability|🚀 Ship Fast, Scale Safely"} placeholder="Marquee items separated by |" className="rounded-lg border px-3 py-2 md:col-span-3" />
              <div className="md:col-span-3">
                <SubmitButton idleText="Save Settings" pendingText="Saving..." className="btn-primary w-fit disabled:opacity-60" />
              </div>
            </div>
          </details>
        </form>

        <details className="mt-6 md:col-span-2 rounded-lg border border-zinc-200 p-3">
          <summary className="cursor-pointer text-sm font-medium">Profile picture Section</summary>
          <div className="mt-3 space-y-4">
            <form action={saveProfileAvatar} className="space-y-2 rounded-lg border p-3">
              <input id="site-avatar-url-profile" type="hidden" name="avatarUrl" defaultValue={settings?.avatarUrl ?? ""} />
              <ImageUploader targetInputId="site-avatar-url-profile" uploadContext="profile" />
              <UrlImagePreview inputId="site-avatar-url-profile" />
              <div className="flex flex-wrap gap-2">
                <SubmitButton idleText="Save profile image" pendingText="Saving..." className="btn-primary" />
                <button type="reset" className="btn-secondary">Reset</button>
              </div>
            </form>

            <form action={clearProfileAvatar}>
              <SubmitButton idleText="Delete current profile image" pendingText="Deleting..." className="btn-danger" />
            </form>

            {mediaAssets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-xs text-zinc-500">🖼️ No uploads yet. Use Profile uploader to add profile images.</div>
            ) : (
              <div className="space-y-4">
                {mediaAssets.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-zinc-600">Profile images (used on home round scroll)</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {mediaAssets.map((asset) => (
                        <div key={asset.id} className="rounded-lg border p-2">
                          <Image src={asset.url} alt={asset.id} width={280} height={120} unoptimized className="h-24 w-full rounded object-cover" />
                          <p className="mt-2 truncate text-[11px] text-zinc-600">{new Date(asset.createdAt).toLocaleString()}</p>
                          <form action={deleteMediaAsset} className="mt-2">
                            <input type="hidden" name="id" value={asset.id} />
                            <SubmitButton idleText="Delete" pendingText="Deleting..." className="btn-danger" />
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                
              </div>
            )}
            <div className="mt-3">
              <SubmitButton idleText="Save Settings" pendingText="Saving..." className="btn-primary w-fit disabled:opacity-60" />
            </div>
          </div>
        </details>
      </section>
      )}

      
      {panel === "about" && (
      <section id="about-cms" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">About CMS</h2>
        <p className="mt-1 text-sm text-zinc-500">Manage your About page content and CV file.</p>

        <form action={saveSettings} className="mt-4 grid gap-3">
          <textarea name="aboutBlock1" defaultValue={(settings as unknown as { aboutBlock1?: string })?.aboutBlock1 ?? ""} placeholder="Summary" className="min-h-28 rounded-lg border px-3 py-2" />
          <textarea name="aboutBlock2" defaultValue={(settings as unknown as { aboutBlock2?: string })?.aboutBlock2 ?? ""} placeholder="Career Experience" className="min-h-28 rounded-lg border px-3 py-2" />
          <textarea name="aboutBlock3" defaultValue={(settings as unknown as { aboutBlock3?: string })?.aboutBlock3 ?? ""} placeholder="Education Experience" className="min-h-28 rounded-lg border px-3 py-2" />

          <div className="rounded-lg border p-3">
            <input id="about-cv-url" type="hidden" name="cvUrl" defaultValue={(settings as unknown as { cvUrl?: string })?.cvUrl ?? ""} />
            <CvUploader targetInputId="about-cv-url" />
            {(settings as unknown as { cvUrl?: string })?.cvUrl && (
              <a href={(settings as unknown as { cvUrl?: string }).cvUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline">Open current CV</a>
            )}
          </div>

          <SubmitButton idleText="Save About" pendingText="Saving..." className="btn-primary w-fit" />
        </form>
      </section>
      )}

{panel === "projects" && (
      <section id="projects-cms" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Projects CMS</h2>

        <details className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4" open>
          <summary className="cursor-pointer text-sm font-semibold">Create project</summary>
          <form id="create-project-form" action={editProject ? updateProject : createProject} className="mt-3 grid gap-3 md:grid-cols-2">
          {editProject && <input type="hidden" name="id" value={editProject.id} />}
          <SlugHelper titleName="title" slugName="slug" taken={projectSlugs.filter((slug) => slug !== (editProject?.slug ?? ""))} defaultTitle={editProject?.title ?? ""} defaultSlug={editProject?.slug ?? ""} />
          <input type="hidden" id="new-project-images" name="projectImages" defaultValue={editProject?.projectImages ?? ""} />
          <div className="space-y-2 md:col-span-2">
            <MultiImageUploader targetInputId="new-project-images" uploadContext="blog" />
          </div>
          <input type="text" name="demoUrl" defaultValue={editProject?.demoUrl ?? ""} placeholder="Project demo/live URL" className="rounded-lg border px-3 py-2 md:col-span-2" />
          <input type="text" name="repoUrl" defaultValue={editProject?.repoUrl ?? ""} placeholder="GitHub URL (optional)" className="rounded-lg border px-3 py-2 md:col-span-2" />
                    <textarea id="new-project-excerpt" name="excerpt" defaultValue={editProject?.summary ?? ""} placeholder="Short excerpt (shown on projects page)" className="min-h-20 rounded-lg border px-3 py-2 md:col-span-2" />
          <div className="md:col-span-2"><ProjectExcerptTool detailsId="new-project-details" excerptId="new-project-excerpt" /></div>
          <textarea id="new-project-details" name="details" defaultValue={editProject?.content ?? ""} placeholder="Project details" className="min-h-28 rounded-lg border px-3 py-2 md:col-span-2" required />
          <div className="md:col-span-2 flex flex-wrap gap-4">
            <label className="text-sm"><input type="checkbox" name="featured" defaultChecked={editProject?.featured ?? false} /> Feature on home page</label>
            <label className="text-sm"><input type="checkbox" name="published" defaultChecked={editProject ? editProject.published : true} /> Published</label>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
          <SubmitButton idleText={editProject ? "Save Changes" : "Add Project"} pendingText={editProject ? "Saving..." : "Adding..."} className="btn-primary w-fit disabled:opacity-60" />
          {editProject && <a href="/admin?panel=projects" className="btn-secondary">Clear edit mode</a>}
          </div>
          </form>

        </details>

        <div className="mt-6 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {projects.length === 0 && <div className="rounded-lg border border-dashed p-3 text-sm text-zinc-500">🧩 No projects match current filter.</div>}
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeTone(p.published)}`}>{p.published ? "Published" : "Draft"}</span>
                  {p.featured && <span className="rounded-full border border-indigo-300/40 bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">Featured</span>}
                </div>
                <span className="text-xs text-zinc-500">Updated {new Date(p.updatedAt).toLocaleString()}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/admin?panel=projects&editProjectId=${p.id}`} className="rounded border px-3 py-1.5 text-sm">Edit</a>
                <a href={`/projects/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded border px-3 py-1.5 text-sm">Open</a>
                {scope === "trash" ? (
                  <>
                    <form action={restoreProject}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton idleText="Restore" pendingText="..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                    </form>
                    <form action={hardDeleteProject}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton idleText="Delete Permanently" pendingText="Deleting..." confirmMessage="Permanently delete this project? This cannot be undone." className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60" />
                    </form>
                  </>
                ) : (
                  <form action={deleteProject}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton idleText="Delete" pendingText="Deleting..." confirmMessage="Move this project to trash?" className="btn-danger" />
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {panel === "blog" && (
      <section id="blog-cms" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Blog CMS</h2>
        {status && ["post-added", "post-updated", "post-trashed", "post-restored", "post-deleted"].includes(status) && (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            {statusText[status]}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href="/admin?panel=blog&blogView=create" className={`rounded border px-3 py-1.5 ${blogView === "create" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>Create blog post</a>
          <a href="/admin?panel=blog&blogView=draft" className={`rounded border px-3 py-1.5 ${blogView === "draft" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>Draft posts ({draftCount})</a>
          <a href="/admin?panel=blog&blogView=published" className={`rounded border px-3 py-1.5 ${blogView === "published" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>Published posts ({publishedCount})</a>
          <a href="/admin?panel=blog&blogView=trash" className={`rounded border px-3 py-1.5 ${blogView === "trash" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}>Trash ({trashCount})</a>
        </div>

        {(blogView === "draft" || blogView === "published" || blogView === "trash") && (
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <input type="hidden" name="panel" value="blog" />
            <input type="hidden" name="blogView" value={blogView} />
            <input name="q" defaultValue={q} placeholder="Search posts..." className="rounded-lg border px-3 py-2" />
            <button className="btn-primary">Apply</button>
            <a href={`/admin?panel=blog&blogView=${blogView}`} className="btn-secondary text-center">Reset</a>
            {editPost ? <a href={`/admin?panel=blog&blogView=create`} className="btn-secondary text-center">Clear edit mode</a> : <span />}
          </form>
        )}

        {blogView === "create" && (<div className="mt-5 rounded-xl border border-zinc-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">{editPost ? `Editing: ${editPost.title}` : "Create new post"}</p>
            {editPost && <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Edit mode</span>}
          </div>

          <form id="create-post-form" action={editPost ? updatePost : createPost} className="mt-3 grid gap-3 md:grid-cols-2">
            {editPost && <input type="hidden" name="id" value={editPost.id} />}
            <input type="hidden" name="published" value={editPost?.published ? "true" : "false"} />
            <SlugHelper
              titleName="title"
              slugName="slug"
              taken={postSlugs.filter((slug) => slug !== (editPost?.slug ?? ""))}
              defaultTitle={editPost?.title ?? ""}
              defaultSlug={editPost?.slug ?? ""}
              titleInputId="create-post-form-title"
            />
            <div className="max-w-xs">
              <input name="writerName" defaultValue={editPost?.writerName ?? ""} placeholder="Writer name" className="w-full rounded-lg border px-3 py-2 text-sm" required />
            </div>
            <div className="max-w-xs">
              <select name="category" defaultValue={editPost?.category ?? "technical"} className="w-full rounded-lg border px-3 py-2 text-sm" required>
                <option value="technical">Technical</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div className="space-y-2">
              <input id="create-post-tags" name="tags" defaultValue={editPost?.tags ?? ""} placeholder="Tags" className="w-full rounded-lg border px-3 py-2" />
              <AutoTagsButton titleInputId="create-post-form-title" contentInputId="create-post-content" tagsInputId="create-post-tags" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <input id="post-image-url" type="text" name="imageUrl" defaultValue={editPost?.imageUrl ?? ""} placeholder="Cover image URL or /api/media/..." className="w-full rounded-lg border px-3 py-2" />
              <input id="post-cover-images" type="hidden" name="coverImages" defaultValue={editPost?.coverImages ?? ""} />
              <ImageUploader targetInputId="post-image-url" uploadContext="blog" />
              <MultiImageUploader targetInputId="post-cover-images" uploadContext="blog" />
              <UrlImagePreview inputId="post-image-url" />
            </div>
            <input type="datetime-local" name="publishAt" defaultValue={editPost?.publishAt ? new Date(editPost.publishAt).toISOString().slice(0, 16) : ""} className="rounded-lg border px-3 py-2 md:col-span-2" />
            <LivePreviewTextarea
              textareaId="create-post-content"
              formId="create-post-form"
              name="content"
              defaultValue={editPost?.content ?? ""}
              placeholder="Post content (supports # headings, - bullets, 1. numbered lists, ![alt](url) images, emoji)"
            />
            <div className="space-y-2 md:col-span-2">
              <input id="create-post-excerpt" name="excerpt" defaultValue={editPost?.excerpt ?? ""} placeholder="Excerpt" className="w-full rounded-lg border px-3 py-2" required />
            </div>
            <div className="md:col-span-2">
              <AutoExcerptButton titleInputId="create-post-form-title" contentInputId="create-post-content" excerptInputId="create-post-excerpt" />
            </div>
            <WriterStatus contentInputId="create-post-content" />
            <PublishChecklist titleId="create-post-form-title" excerptId="create-post-excerpt" tagsId="create-post-tags" contentId="create-post-content" />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="submit" formAction={editPost ? updatePostPublish : createPostPublish} className="btn-primary">Publish post</button>
              <button type="submit" formAction={editPost ? updatePostDraft : createPostDraft} className="btn-secondary">Save as draft</button>
              {editPost ? (
                <a href={`/blog/${editPost.slug}?preview=${encodeURIComponent(previewToken)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Full preview</a>
              ) : (
                <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800" title="Save as draft first to enable full preview">
                  Full preview (save draft first)
                </span>
              )}
              {editPost && <a href={`/admin?panel=blog&blogView=${blogView === "create" ? "published" : blogView}`} className="btn-secondary">Back to list</a>}
            </div>
          </form>
        </div>)}

        {(blogView === "draft" || blogView === "published" || blogView === "trash") && (
          <div className="mt-6 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {posts.length === 0 && <div className="rounded-lg border border-dashed p-3 text-sm text-zinc-500">0 posts</div>}
            {posts.map((p) => (
              <div key={p.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-zinc-500">Writer: {p.writerName || "Not set"} • Category: {p.category || "technical"}</p>
                  </div>
                  {p.deletedAt ? (
                    <p className="text-xs text-zinc-500">Deleted {new Date(p.deletedAt).toLocaleString()}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">Updated {new Date(p.updatedAt).toLocaleString()}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.deletedAt ? (
                    <>
                      <form action={restorePost}>
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton idleText="Restore" pendingText="..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                      </form>
                      <form action={hardDeletePost}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmitButton idleText="Delete Permanently" pendingText="Deleting..." confirmMessage="Permanently delete this post? This cannot be undone." className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60" />
                      </form>
                    </>
                  ) : (
                    <>
                      <a href={`/admin?panel=blog&blogView=create&editId=${p.id}`} className="rounded border px-3 py-1.5 text-sm">Edit</a>
                      <a href={`/blog/${p.slug}?preview=${encodeURIComponent(previewToken)}`} target="_blank" rel="noopener noreferrer" className="rounded border px-3 py-1.5 text-sm">Full preview</a>
                      <form action={deletePost}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="fromView" value={blogView} />
                        <ConfirmSubmitButton idleText="Delete" pendingText="Deleting..." confirmMessage="Move this post to trash?" className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60" />
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}


      {panel === "research" && (
      <section id="research-cms" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Research Publications</h2>
        <p className="mt-1 text-sm text-zinc-500">Add or delete publications for the public research page.</p>

        <form action={editPublication ? updatePublication : createPublication} className="mt-4 grid gap-3 md:grid-cols-2">
          {editPublication && <input type="hidden" name="id" value={editPublication.id} />}
          <input name="title" defaultValue={editPublication?.title ?? ""} placeholder="Publication title" className="rounded-lg border px-3 py-2 md:col-span-2" required />
          <input name="authors" defaultValue={editPublication?.authors ?? ""} placeholder="Authors" className="rounded-lg border px-3 py-2 md:col-span-2" required />
          <input name="venue" defaultValue={editPublication?.venue ?? ""} placeholder="Venue / Journal / Conference" className="rounded-lg border px-3 py-2" required />
          <input name="year" type="number" defaultValue={editPublication?.year ?? ""} placeholder="Year" className="rounded-lg border px-3 py-2" required />
          <input name="url" type="text" defaultValue={editPublication?.url ?? ""} placeholder="Publication URL (optional)" className="rounded-lg border px-3 py-2 md:col-span-2" />
          <textarea id="publication-abstract" name="abstract" defaultValue={editPublication?.abstract ?? ""} placeholder="Abstract" className="min-h-24 rounded-lg border px-3 py-2 md:col-span-2" />
          <textarea id="publication-excerpt" name="excerpt" defaultValue={editPublication?.excerpt ?? ""} placeholder="Short excerpt (shown on Research page)" className="min-h-20 rounded-lg border px-3 py-2 md:col-span-2" />
          <div className="md:col-span-2"><PublicationExcerptTool abstractId="publication-abstract" excerptId="publication-excerpt" /></div>
          <div className="md:col-span-2 flex flex-wrap gap-4">
            <label className="text-sm"><input type="checkbox" name="featured" defaultChecked={editProject?.featured ?? false} /> Feature on home page</label>
            <label className="text-sm"><input type="checkbox" name="published" defaultChecked={editProject ? editProject.published : true} /> Published</label>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
          <SubmitButton idleText={editPublication ? "Save Changes" : "Add Publication"} pendingText={editPublication ? "Saving..." : "Adding..."} className="btn-primary w-fit" />
          {editPublication && <a href="/admin?panel=research" className="btn-secondary">Clear edit mode</a>}
        </div>
        </form>

        <div className="mt-6 space-y-3">
          {publications.length === 0 && <div className="rounded-lg border border-dashed p-3 text-sm text-zinc-500">No publications yet.</div>}
          {publications.map((pub) => (
            <div key={pub.id} className="rounded-xl border border-zinc-200 p-4">
              <p className="font-semibold">{pub.title}</p>
              <p className="text-sm text-zinc-600">{pub.authors}</p>
              <p className="text-xs text-zinc-500">{pub.venue} • {pub.year}</p>
              <div className="mt-2 flex gap-2">
                <a href={`/admin?panel=research&editPublicationId=${pub.id}`} className="rounded border px-3 py-1.5 text-sm">Edit</a>
                {pub.url && <a href={pub.url} target="_blank" rel="noopener noreferrer" className="rounded border px-3 py-1.5 text-sm">Open</a>}
                <form action={deletePublication}>
                  <input type="hidden" name="id" value={pub.id} />
                  <ConfirmSubmitButton idleText="Delete" pendingText="Deleting..." confirmMessage="Delete this publication?" className="btn-danger" />
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {panel === "users" && (
      <section id="admin-users" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Admin Users</h2>
        {sessionRole === "owner" ? (
          <form action={createAdminUser} className="grid gap-3 md:grid-cols-4">
            <input name="name" placeholder="Name" className="rounded-lg border px-3 py-2" required />
            <input type="email" name="email" placeholder="Email" className="rounded-lg border px-3 py-2" required />
            <input type="text" name="password" placeholder="Password" className="rounded-lg border px-3 py-2" required />
            <select name="role" defaultValue="editor" className="rounded-lg border px-3 py-2">
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
            <SubmitButton idleText="Save Admin User" pendingText="Saving..." className="btn-primary w-fit disabled:opacity-60 md:col-span-4" />
          </form>
        ) : (
          <p className="text-sm text-zinc-500">Only owner can manage admin users.</p>
        )}

        <div className="mt-4 space-y-2">
          {adminUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <b>{u.name}</b> <span className="text-zinc-500">({u.email})</span>
                <span className="ml-2 rounded border px-2 py-0.5 text-xs">{u.role}</span>
                <span className={`ml-2 rounded border px-2 py-0.5 text-xs ${u.active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-100 text-zinc-600"}`}>{u.active ? "Active" : "Disabled"}</span>
              </div>
              {sessionRole === "owner" && (
                <form action={toggleAdminUserActive}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="active" value={String(u.active)} />
                  <SubmitButton idleText={u.active ? "Disable" : "Enable"} pendingText="..." className="rounded border px-3 py-1" />
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {panel === "security" && (
      <section id="security" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Security</h2>
        <form action={changeMyPassword} className="grid gap-3 md:grid-cols-3">
          <input type="password" name="currentPassword" placeholder="Current password" className="rounded-lg border px-3 py-2" required />
          <input type="password" name="newPassword" placeholder="New password (min 8 chars)" className="rounded-lg border px-3 py-2" required />
          <input type="password" name="confirmPassword" placeholder="Confirm new password" className="rounded-lg border px-3 py-2" required />
          <SubmitButton idleText="Change Password" pendingText="Updating..." className="btn-primary w-fit disabled:opacity-60 md:col-span-3" />
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={forceLogoutMySessions}>
            <SubmitButton idleText="Force Logout My Other Sessions" pendingText="Working..." className="rounded border px-3 py-2 text-sm" />
          </form>
          {sessionRole === "owner" && (
            <form action={forceLogoutAllAdminSessions}>
              <SubmitButton idleText="Force Logout All Admin Sessions" pendingText="Working..." className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" />
            </form>
          )}
        </div>

        {revealCodes.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-lg font-semibold text-amber-900">Save these recovery codes now</h3>
            <p className="mt-1 text-sm text-amber-800">Each code can be used once if you lose your authenticator access.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {revealCodes.map((c) => (
                <code key={c} className="rounded bg-white px-2 py-1 text-sm">{c}</code>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border p-4">
          <h3 className="text-lg font-semibold">Owner 2FA (TOTP)</h3>
          {me?.totpEnabled ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-emerald-700">2FA is enabled for your account.</p>
              <form action={regenerateRecoveryCodes} className="grid gap-3 md:grid-cols-2">
                <input type="password" name="password" placeholder="Current password to regenerate recovery codes" className="rounded-lg border px-3 py-2" required />
                <SubmitButton idleText="Regenerate Recovery Codes" pendingText="Regenerating..." className="w-fit btn-primary disabled:opacity-60" />
              </form>
              <form action={disableMyTotp} className="grid gap-3 md:grid-cols-2">
                <input type="password" name="password" placeholder="Current password to disable 2FA" className="rounded-lg border px-3 py-2" required />
                <SubmitButton idleText="Disable 2FA" pendingText="Disabling..." className="w-fit rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700 disabled:opacity-60" />
              </form>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-zinc-600">Scan QR in Google Authenticator/Authy/1Password and enter 6-digit code.</p>
              {setupTotpQr && <Image src={setupTotpQr} alt="TOTP QR" width={160} height={160} unoptimized className="h-40 w-40 rounded border" />}
              <form action={enableMyTotp} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="totpSecret" value={setupTotpSecret ?? ""} />
                <input type="text" name="totpToken" placeholder="6-digit authenticator code" className="rounded-lg border px-3 py-2" required />
                <SubmitButton idleText="Enable 2FA" pendingText="Enabling..." className="w-fit btn-primary disabled:opacity-60" />
              </form>
            </div>
          )}
        </div>
      </section>
      )}

      {panel === "audit" && (
      <section id="audit-log" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Audit Log (latest 30)</h2>
        <div className="space-y-2 text-sm">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b>{log.action}</b> on <span className="font-medium">{log.targetType}</span>
                  {log.targetId ? <span className="text-zinc-500"> ({log.targetId})</span> : null}
                </div>
                <span className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-zinc-500">by {log.actorEmail ?? "unknown"} ({log.actorRole ?? "n/a"}) {log.meta ? `• ${log.meta}` : ""}</p>
            </div>
          ))}
        </div>
      </section>
      )}
    </main>
  );
}
