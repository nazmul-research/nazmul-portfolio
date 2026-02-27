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
import FormDraftAssist from "@/components/form-draft-assist";
import ReorderList from "@/components/reorder-list";
import LivePreviewTextarea from "@/components/live-preview-textarea";
import UrlImagePreview from "@/components/url-image-preview";
import SlugHelper from "@/components/slug-helper";
import BioField from "@/components/bio-field";
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
  contributionTitle: z.string().trim().optional().or(z.literal("")),
  contributionText: z.string().trim().optional().or(z.literal("")),
  bio: z.string().trim().min(10),
  location: z.string().trim().optional(),
  email: z.string().trim().optional().or(z.literal("")),
  linkedinUrl: z.string().trim().optional().or(z.literal("")),
  githubUrl: z.string().trim().optional().or(z.literal("")),
  githubUrl2: z.string().trim().optional().or(z.literal("")),
  whatsappUrl: z.string().trim().optional().or(z.literal("")),
  scholarUrl: z.string().trim().optional().or(z.literal("")),
  researchGateUrl: z.string().trim().optional().or(z.literal("")),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
});

const projectSchema = z.object({
  title: z.string().trim().min(2),
  summary: z.string().trim().min(10),
  content: z.string().trim().min(10),
  stack: z.string().trim().optional(),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  demoUrl: z.string().trim().url().optional().or(z.literal("")),
  repoUrl: z.string().trim().url().optional().or(z.literal("")),
  featured: z.boolean(),
  featuredOrder: z.number().int().min(0),
  published: z.boolean(),
  publishAt: z.string().optional().or(z.literal("")),
});

const postSchema = z.object({
  title: z.string().trim().min(2),
  excerpt: z.string().trim().min(10),
  content: z.string().trim().min(10),
  tags: z.string().trim().optional(),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  published: z.boolean(),
  publishAt: z.string().optional().or(z.literal("")),
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

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
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
    contributionTitle: String(formData.get("contributionTitle") || ""),
    contributionText: String(formData.get("contributionText") || ""),
    bio: String(formData.get("bio") || ""),
    location: String(formData.get("location") || ""),
    email: String(formData.get("email") || ""),
    linkedinUrl: String(formData.get("linkedinUrl") || ""),
    githubUrl: String(formData.get("githubUrl") || ""),
    githubUrl2: String(formData.get("githubUrl2") || ""),
    whatsappUrl: String(formData.get("whatsappUrl") || ""),
    scholarUrl: String(formData.get("scholarUrl") || ""),
    researchGateUrl: String(formData.get("researchGateUrl") || ""),
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
      contributionTitle: cleanOptional(parsed.data.contributionTitle) ?? "Contribution",
      contributionText: cleanOptional(parsed.data.contributionText) ?? "Open-source contributions\nResearch collaboration\nCommunity mentoring",
      bio: parsed.data.bio,
      location: cleanOptional(parsed.data.location),
      email: normalizeEmail(parsed.data.email),
      linkedinUrl: normalizeUrl(parsed.data.linkedinUrl),
      githubUrl: normalizeUrl(parsed.data.githubUrl),
      githubUrl2: normalizeUrl(parsed.data.githubUrl2),
      whatsappUrl: normalizeUrl(parsed.data.whatsappUrl),
      scholarUrl: normalizeUrl(parsed.data.scholarUrl),
      researchGateUrl: normalizeUrl(parsed.data.researchGateUrl),
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
      contributionTitle: cleanOptional(parsed.data.contributionTitle) ?? "Contribution",
      contributionText: cleanOptional(parsed.data.contributionText) ?? "Open-source contributions\nResearch collaboration\nCommunity mentoring",
      bio: parsed.data.bio,
      location: cleanOptional(parsed.data.location),
      email: normalizeEmail(parsed.data.email),
      linkedinUrl: normalizeUrl(parsed.data.linkedinUrl),
      githubUrl: normalizeUrl(parsed.data.githubUrl),
      githubUrl2: normalizeUrl(parsed.data.githubUrl2),
      whatsappUrl: normalizeUrl(parsed.data.whatsappUrl),
      scholarUrl: normalizeUrl(parsed.data.scholarUrl),
      researchGateUrl: normalizeUrl(parsed.data.researchGateUrl),
      avatarUrl: normalizeUrl(parsed.data.avatarUrl),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  await writeAuditLog({ action: "settings.update", targetType: "site", targetId: "main" });
  adminRedirect("settings-saved");
}

async function createProject(formData: FormData) {
  "use server";

  const parsed = projectSchema.safeParse({
    title: String(formData.get("title") || ""),
    summary: String(formData.get("summary") || ""),
    content: String(formData.get("content") || ""),
    stack: String(formData.get("stack") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    demoUrl: String(formData.get("demoUrl") || ""),
    repoUrl: String(formData.get("repoUrl") || ""),
    featured: asBool(formData.get("featured")),
    featuredOrder: Number(formData.get("featuredOrder") || 0),
    published: asBool(formData.get("published")),
    publishAt: String(formData.get("publishAt") || ""),
  });

  if (!parsed.success) adminRedirect("project-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  const slug = slugInput || `${slugify(parsed.data.title)}-${Math.floor(Math.random() * 9999)}`;

  const existingSlug = await prisma.project.findUnique({ where: { slug } });
  if (existingSlug) adminRedirect("slug-conflict");

  await prisma.project.create({
    data: {
      title: parsed.data.title,
      slug,
      summary: parsed.data.summary,
      content: parsed.data.content,
      stack: cleanOptional(parsed.data.stack),
      imageUrl: normalizeUrl(parsed.data.imageUrl),
      demoUrl: normalizeUrl(parsed.data.demoUrl),
      repoUrl: normalizeUrl(parsed.data.repoUrl),
      featured: parsed.data.featured,
      featuredOrder: parsed.data.featuredOrder,
      published: parsed.data.published,
      publishAt: normalizeDateTime(parsed.data.publishAt),
      deletedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.create", targetType: "project", targetId: slug });
  adminRedirect("project-added");
}

async function updateProject(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("project-update-failed");

  const parsed = projectSchema.safeParse({
    title: String(formData.get("title") || ""),
    summary: String(formData.get("summary") || ""),
    content: String(formData.get("content") || ""),
    stack: String(formData.get("stack") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    demoUrl: String(formData.get("demoUrl") || ""),
    repoUrl: String(formData.get("repoUrl") || ""),
    featured: asBool(formData.get("featured")),
    featuredOrder: Number(formData.get("featuredOrder") || 0),
    published: asBool(formData.get("published")),
    publishAt: String(formData.get("publishAt") || ""),
  });

  if (!parsed.success) adminRedirect("project-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  if (slugInput) {
    const existingSlug = await prisma.project.findUnique({ where: { slug: slugInput } });
    if (existingSlug && existingSlug.id !== id) adminRedirect("slug-conflict");
  }

  await prisma.project.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: slugInput || undefined,
      summary: parsed.data.summary,
      content: parsed.data.content,
      stack: cleanOptional(parsed.data.stack),
      imageUrl: normalizeUrl(parsed.data.imageUrl),
      demoUrl: normalizeUrl(parsed.data.demoUrl),
      repoUrl: normalizeUrl(parsed.data.repoUrl),
      featured: parsed.data.featured,
      featuredOrder: parsed.data.featuredOrder,
      published: parsed.data.published,
      publishAt: normalizeDateTime(parsed.data.publishAt),
    },
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.update", targetType: "project", targetId: id });
  adminRedirect("project-updated");
}

async function deleteProject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("project-delete-failed");

  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.trash", targetType: "project", targetId: id });
  adminRedirect("project-trashed");
}

async function restoreProject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("project-restore-failed");

  await prisma.project.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.restore", targetType: "project", targetId: id });
  adminRedirect("project-restored");
}

async function hardDeleteProject(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("project-delete-failed");

  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.delete", targetType: "project", targetId: id });
  adminRedirect("project-deleted");
}

async function toggleProjectPublish(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  const published = String(formData.get("published") || "false") === "true";
  if (!id) adminRedirect("project-toggle-failed");

  await prisma.project.update({ where: { id }, data: { published: !published } });
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: published ? "project.unpublish" : "project.publish", targetType: "project", targetId: id });
  adminRedirect(published ? "project-unpublished" : "project-published");
}

async function nudgeFeaturedOrder(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  const direction = String(formData.get("direction") || "");
  if (!id || !["up", "down"].includes(direction)) adminRedirect("project-reorder-failed");

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) adminRedirect("project-reorder-failed");

  const delta = direction === "up" ? -1 : 1;
  const nextOrder = Math.max(0, project.featuredOrder + delta);

  await prisma.project.update({ where: { id }, data: { featuredOrder: nextOrder, featured: true } });

  revalidatePath("/");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.reorder", targetType: "project", targetId: id, meta: direction });
  adminRedirect("project-reordered");
}

async function saveProjectSortOrder(formData: FormData) {
  "use server";
  const raw = String(formData.get("projectOrder") || "[]");
  let ids: string[] = [];
  try {
    ids = JSON.parse(raw) as string[];
  } catch {
    adminRedirect("project-reorder-failed");
  }

  await Promise.all(ids.map((id, idx) => prisma.project.update({ where: { id }, data: { sortOrder: idx } })));
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/admin");
  await writeAuditLog({ action: "project.sort_order", targetType: "project", targetId: String(ids.length), meta: "drag-drop" });
  adminRedirect("project-reordered");
}

async function savePostSortOrder(formData: FormData) {
  "use server";
  const raw = String(formData.get("postOrder") || "[]");
  let ids: string[] = [];
  try {
    ids = JSON.parse(raw) as string[];
  } catch {
    adminRedirect("post-invalid");
  }

  await Promise.all(ids.map((id, idx) => prisma.post.update({ where: { id }, data: { sortOrder: idx } })));
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.sort_order", targetType: "post", targetId: String(ids.length), meta: "drag-drop" });
  adminRedirect("post-updated");
}

async function createPost(formData: FormData) {
  "use server";

  const parsed = postSchema.safeParse({
    title: String(formData.get("title") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    content: String(formData.get("content") || ""),
    tags: String(formData.get("tags") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    published: asBool(formData.get("published")),
    publishAt: String(formData.get("publishAt") || ""),
  });

  if (!parsed.success) adminRedirect("post-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  const slug = slugInput || `${slugify(parsed.data.title)}-${Math.floor(Math.random() * 9999)}`;

  const existingSlug = await prisma.post.findUnique({ where: { slug } });
  if (existingSlug) adminRedirect("slug-conflict");

  await prisma.post.create({
    data: {
      title: parsed.data.title,
      slug,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      tags: cleanOptional(parsed.data.tags),
      imageUrl: normalizeUrl(parsed.data.imageUrl),
      published: parsed.data.published,
      publishAt: normalizeDateTime(parsed.data.publishAt),
      deletedAt: null,
    },
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.create", targetType: "post", targetId: slug });
  adminRedirect("post-added");
}

async function updatePost(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("post-update-failed");

  const parsed = postSchema.safeParse({
    title: String(formData.get("title") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    content: String(formData.get("content") || ""),
    tags: String(formData.get("tags") || ""),
    imageUrl: String(formData.get("imageUrl") || ""),
    published: asBool(formData.get("published")),
    publishAt: String(formData.get("publishAt") || ""),
  });

  if (!parsed.success) adminRedirect("post-invalid");

  const slugInput = slugify(String(formData.get("slug") || ""));
  if (slugInput) {
    const existingSlug = await prisma.post.findUnique({ where: { slug: slugInput } });
    if (existingSlug && existingSlug.id !== id) adminRedirect("slug-conflict");
  }

  await prisma.post.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: slugInput || undefined,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      tags: cleanOptional(parsed.data.tags),
      imageUrl: normalizeUrl(parsed.data.imageUrl),
      published: parsed.data.published,
      publishAt: normalizeDateTime(parsed.data.publishAt),
    },
  });

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.update", targetType: "post", targetId: id });
  adminRedirect("post-updated");
}

async function deletePost(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("post-delete-failed");

  await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.trash", targetType: "post", targetId: id });
  adminRedirect("post-trashed");
}

async function restorePost(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("post-restore-failed");

  await prisma.post.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.restore", targetType: "post", targetId: id });
  adminRedirect("post-restored");
}

async function hardDeletePost(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  const id = String(formData.get("id") || "").trim();
  if (!id) adminRedirect("post-delete-failed");

  await prisma.post.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: "post.delete", targetType: "post", targetId: id });
  adminRedirect("post-deleted");
}

async function togglePostPublish(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "").trim();
  const published = String(formData.get("published") || "false") === "true";
  if (!id) adminRedirect("post-toggle-failed");

  await prisma.post.update({ where: { id }, data: { published: !published } });
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  await writeAuditLog({ action: published ? "post.unpublish" : "post.publish", targetType: "post", targetId: id });
  adminRedirect(published ? "post-unpublished" : "post-published");
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

async function createAdminUser(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") adminRedirect("admin-forbidden");

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const name = String(formData.get("name") || "").trim() || "Editor";
  const userRole = String(formData.get("role") || "editor").trim() || "editor";

  if (!email || password.length < 8) adminRedirect("admin-user-invalid");

  const passwordHash = await hashPassword(password);

  await prisma.adminUser.upsert({
    where: { email },
    update: { password: passwordHash, passwordUpdatedAt: new Date(), name, role: userRole, active: true, sessionVersion: { increment: 1 } },
    create: { email, password: passwordHash, passwordUpdatedAt: new Date(), name, role: userRole, active: true },
  });

  revalidatePath("/admin");
  await writeAuditLog({ action: "admin_user.upsert", targetType: "admin_user", targetId: email, meta: userRole });
  adminRedirect("admin-user-saved");
}

async function toggleAdminUserActive(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const actorRole = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || actorRole !== "owner") adminRedirect("admin-forbidden");

  const id = String(formData.get("id") || "").trim();
  const active = String(formData.get("active") || "false") === "true";
  if (!id) adminRedirect("admin-user-invalid");

  await prisma.adminUser.update({ where: { id }, data: { active: !active } });
  revalidatePath("/admin");
  await writeAuditLog({ action: active ? "admin_user.deactivate" : "admin_user.activate", targetType: "admin_user", targetId: id });
  adminRedirect(active ? "admin-user-deactivated" : "admin-user-activated");
}

async function forceLogoutMySessions() {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("admin-forbidden");

  await prisma.adminUser.update({ where: { email }, data: { sessionVersion: { increment: 1 } } });
  await writeAuditLog({ action: "admin_user.force_logout_self", targetType: "admin_user", targetId: email });
  adminRedirect("sessions-revoked");
}

async function forceLogoutAllAdminSessions() {
  "use server";
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user?.email || role !== "owner") adminRedirect("admin-forbidden");

  await prisma.adminUser.updateMany({ data: { sessionVersion: { increment: 1 } } });
  await writeAuditLog({ action: "admin_user.force_logout_all", targetType: "admin_user", targetId: "all" });
  adminRedirect("sessions-revoked-all");
}

async function changeMyPassword(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("admin-forbidden");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8 || newPassword !== confirmPassword) adminRedirect("password-invalid");

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) adminRedirect("password-invalid");

  const ok = await verifyPassword(currentPassword, admin.password);
  if (!ok) adminRedirect("password-invalid");

  const hashed = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { password: hashed, passwordUpdatedAt: new Date(), sessionVersion: { increment: 1 } } });

  await writeAuditLog({ action: "admin_user.change_password", targetType: "admin_user", targetId: admin.id });
  adminRedirect("password-changed");
}

async function enableMyTotp(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("admin-forbidden");

  const token = String(formData.get("totpToken") || "").trim().replace(/\s+/g, "");
  const secret = String(formData.get("totpSecret") || "").trim();
  if (!token || !secret) adminRedirect("totp-invalid");

  const valid = authenticator.verify({ token, secret });
  if (!valid) adminRedirect("totp-invalid");

  const recoveryCodes = generateRecoveryCodes(8);
  const recoveryCodesHash = await hashRecoveryCodes(recoveryCodes);

  await prisma.adminUser.update({ where: { email }, data: { totpEnabled: true, totpSecret: secret, recoveryCodesHash } });
  await writeAuditLog({ action: "admin_user.enable_totp", targetType: "admin_user", targetId: email });

  const encoded = encodeURIComponent(Buffer.from(JSON.stringify(recoveryCodes)).toString("base64"));
  redirect(`/admin?status=totp-enabled&codes=${encoded}`);
}

async function disableMyTotp(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("admin-forbidden");

  const password = String(formData.get("password") || "");
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) adminRedirect("totp-invalid");

  const ok = await verifyPassword(password, admin.password);
  if (!ok) adminRedirect("totp-invalid");

  await prisma.adminUser.update({ where: { email }, data: { totpEnabled: false, totpSecret: null, recoveryCodesHash: null } });
  await writeAuditLog({ action: "admin_user.disable_totp", targetType: "admin_user", targetId: email });
  adminRedirect("totp-disabled");
}

async function regenerateRecoveryCodes(formData: FormData) {
  "use server";
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) adminRedirect("admin-forbidden");

  const password = String(formData.get("password") || "");
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.totpEnabled) adminRedirect("totp-invalid");

  const ok = await verifyPassword(password, admin.password);
  if (!ok) adminRedirect("totp-invalid");

  const recoveryCodes = generateRecoveryCodes(8);
  const recoveryCodesHash = await hashRecoveryCodes(recoveryCodes);

  await prisma.adminUser.update({ where: { email }, data: { recoveryCodesHash } });
  await writeAuditLog({ action: "admin_user.regenerate_recovery_codes", targetType: "admin_user", targetId: email });

  const encoded = encodeURIComponent(Buffer.from(JSON.stringify(recoveryCodes)).toString("base64"));
  redirect(`/admin?status=recovery-codes-regenerated&codes=${encoded}`);
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
};

function badgeTone(published: boolean) {
  return published
    ? "border-emerald-300/40 bg-emerald-100 text-emerald-700"
    : "border-amber-300/40 bg-amber-100 text-amber-700";
}

function NavIcon({ kind }: { kind: "site" | "projects" | "blog" | "users" | "security" | "audit" }) {
  const paths: Record<string, string> = {
    site: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
    projects: "M4 6h7v7H4zM13 6h7v4h-7zM13 12h7v7h-7zM4 15h7v4H4z",
    blog: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 4h10M7 12h10M7 16h6",
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
    ...(scope === "trash" ? { deletedAt: { not: null } } : { deletedAt: null }),
    ...(filter === "published" ? { published: true } : {}),
    ...(filter === "draft" ? { published: false } : {}),
  };

  const [settings, projects, posts, adminUsers, auditLogs, me, mediaAssets] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "main" } }),
    prisma.project.findMany({ where: projectWhere, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.post.findMany({ where: postWhere, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.adminUser.findUnique({ where: { email: session.user?.email?.toLowerCase() || "" } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 24 }),
  ]);

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

      {status && statusText[status] && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-100 px-4 py-3 text-sm text-emerald-900 shadow-sm">{statusText[status]}</div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm backdrop-blur transition-all duration-300">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <a href="/admin?panel=site" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "site" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="site" />Site</a>
          <a href="/admin?panel=projects" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "projects" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="projects" />Projects</a>
          <a href="/admin?panel=blog" className={`admin-nav-link rounded border px-2 py-1 transition ${panel === "blog" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}><NavIcon kind="blog" />Blog</a>
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
        {(panel === "projects" || panel === "blog") && (
          <form className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
            <input type="hidden" name="panel" value={panel} />
            <input
              name="q"
              defaultValue={q}
              placeholder={panel === "projects" ? "Search projects..." : "Search posts..."}
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
          <input name="fullName" defaultValue={settings?.fullName ?? "Nazmul Islam"} placeholder="Full name" className="rounded-lg border px-3 py-2" required />
          <input name="headline" defaultValue={settings?.headline ?? "AI • Robotics • Agent Systems"} placeholder="Headline" className="rounded-lg border px-3 py-2" required />
          <input name="availabilityTag" defaultValue={(settings as unknown as { availabilityTag?: string })?.availabilityTag ?? "Available for Biomedical + AI + Robotics projects"} placeholder="Availability tag" className="rounded-lg border px-3 py-2" />
          <input name="location" defaultValue={settings?.location ?? ""} placeholder="Location" className="rounded-lg border px-3 py-2" />

          <details className="md:col-span-2 rounded-lg border border-zinc-200 p-3" open>
            <summary className="cursor-pointer text-sm font-medium">Hero / Main section</summary>
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
            </div>
          </details>

          <details className="md:col-span-2 rounded-lg border border-zinc-200 p-3" open>
            <summary className="cursor-pointer text-sm font-medium">Contribution section</summary>
            <div className="mt-3 grid gap-3">
              <input name="contributionTitle" defaultValue={(settings as unknown as { contributionTitle?: string })?.contributionTitle ?? "Contribution"} placeholder="Contribution title" className="rounded-lg border px-3 py-2" />
              <textarea name="contributionText" defaultValue={(settings as unknown as { contributionText?: string })?.contributionText ?? "Open-source contributions\nResearch collaboration\nCommunity mentoring"} placeholder="One point per line" className="min-h-24 rounded-lg border px-3 py-2" />
            </div>
          </details>
          <input type="email" name="email" defaultValue={settings?.email ?? ""} placeholder="Email" className="rounded-lg border px-3 py-2" />
          <input type="url" name="linkedinUrl" defaultValue={settings?.linkedinUrl ?? "https://www.linkedin.com/in/nazmul87/"} placeholder="LinkedIn URL" className="rounded-lg border px-3 py-2" />
          <input type="url" name="githubUrl" defaultValue={settings?.githubUrl ?? "https://github.com/mdnazmulislam0087"} placeholder="GitHub URL" className="rounded-lg border px-3 py-2" />
          <input type="url" name="githubUrl2" defaultValue={(settings as unknown as { githubUrl2?: string })?.githubUrl2 ?? ""} placeholder="Second GitHub URL" className="rounded-lg border px-3 py-2" />
          <input type="url" name="whatsappUrl" defaultValue={(settings as unknown as { whatsappUrl?: string })?.whatsappUrl ?? "https://wa.me/"} placeholder="WhatsApp URL" className="rounded-lg border px-3 py-2" />
          <input type="url" name="scholarUrl" defaultValue={(settings as unknown as { scholarUrl?: string })?.scholarUrl ?? "https://scholar.google.com/"} placeholder="Google Scholar URL" className="rounded-lg border px-3 py-2" />
          <input type="url" name="researchGateUrl" defaultValue={(settings as unknown as { researchGateUrl?: string })?.researchGateUrl ?? "https://www.researchgate.net/"} placeholder="ResearchGate URL" className="rounded-lg border px-3 py-2 md:col-span-2" />
          <div className="space-y-2 md:col-span-2">
            <input id="site-avatar-url" type="hidden" name="avatarUrl" defaultValue={settings?.avatarUrl ?? ""} />
            <ImageUploader targetInputId="site-avatar-url" />
            <UrlImagePreview inputId="site-avatar-url" />
          </div>
          <BioField initial={settings?.bio ?? ""} />
          <SubmitButton idleText="Save Settings" pendingText="Saving..." className="btn-primary w-fit disabled:opacity-60 md:col-span-2" />
        </form>

        <div className="mt-6 rounded-xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-700">Media Library (latest uploads)</h3>
          {mediaAssets.length === 0 ? (
            <div className="mt-2 rounded-lg border border-dashed p-3 text-xs text-zinc-500">🖼️ No uploads yet. Use any upload button to add images.</div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
          )}
        </div>
      </section>
      )}

      {panel === "projects" && (
      <section id="projects-cms" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Projects CMS</h2>

        <details className="rounded-xl border border-zinc-200 p-4" open>
          <summary className="cursor-pointer text-sm font-medium">Create project</summary>
          <form id="create-project-form" action={createProject} className="mt-3 grid gap-3 md:grid-cols-2">
          <SlugHelper titleName="title" slugName="slug" taken={projectSlugs} />
          <input name="stack" placeholder="Stack (e.g. Next.js, Python)" className="rounded-lg border px-3 py-2" />
          <div className="space-y-2">
            <input id="new-project-image-url" type="url" name="imageUrl" placeholder="Image URL" className="w-full rounded-lg border px-3 py-2" />
            <ImageUploader targetInputId="new-project-image-url" />
          </div>
          <input type="url" name="demoUrl" placeholder="Demo URL" className="rounded-lg border px-3 py-2" />
          <input type="url" name="repoUrl" placeholder="Repo URL" className="rounded-lg border px-3 py-2 md:col-span-2" />
          <input type="datetime-local" name="publishAt" className="rounded-lg border px-3 py-2 md:col-span-2" />
          <input name="summary" placeholder="Summary" className="rounded-lg border px-3 py-2 md:col-span-2" required />
          <textarea name="content" placeholder="Project details" className="min-h-24 rounded-lg border px-3 py-2 md:col-span-2" required />
          <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
            <label className="text-sm"><input type="checkbox" name="featured" /> Featured on homepage</label>
            <label className="text-sm"><input type="checkbox" name="published" defaultChecked /> Published</label>
            <input type="number" min="0" name="featuredOrder" defaultValue={0} placeholder="Featured order (0 first)" className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <SubmitButton idleText="Add Project" pendingText="Adding..." className="btn-primary w-fit disabled:opacity-60 md:col-span-2" />
          </form>
          <div className="mt-2"><FormDraftAssist formId="create-project-form" storageKey="admin-create-project-draft" /></div>
        </details>

        <div className="mt-6 rounded-xl border border-zinc-200 p-3">
          <p className="mb-2 text-sm font-medium text-zinc-700">Drag to reorder project display order</p>
          <form action={saveProjectSortOrder} className="space-y-3">
            <ReorderList inputName="projectOrder" items={projects.map((p) => ({ id: p.id, label: p.title }))} />
            <SubmitButton idleText="Save Project Order" pendingText="Saving..." className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white" />
          </form>
        </div>

        <div className="mt-6 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {projects.length === 0 && <div className="rounded-lg border border-dashed p-3 text-sm text-zinc-500">🧩 No projects match current filter.</div>}
          {projects.map((p) => (
            <details key={p.id} className="rounded-xl border border-zinc-200 p-4" open={false}>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeTone(p.published)}`}>{p.published ? "Published" : "Draft"}</span>
                  {p.featured && <span className="rounded-full border border-indigo-300/40 bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">Featured</span>}
                </div>
                <span className="text-xs text-zinc-500">Updated {new Date(p.updatedAt).toLocaleString()}</span>
              </summary>

              <form action={updateProject} className="mt-4 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={p.id} />
                <SlugHelper titleName="title" slugName="slug" defaultTitle={p.title} defaultSlug={p.slug} taken={projectSlugs} />
                <input name="stack" defaultValue={p.stack ?? ""} className="rounded-lg border px-3 py-2" />
                <div className="space-y-2">
                  <input id={`project-image-url-${p.id}`} type="url" name="imageUrl" defaultValue={p.imageUrl ?? ""} className="w-full rounded-lg border px-3 py-2" />
                  <ImageUploader targetInputId={`project-image-url-${p.id}`} />
                </div>
                <input type="url" name="demoUrl" defaultValue={p.demoUrl ?? ""} className="rounded-lg border px-3 py-2" />
                <input type="url" name="repoUrl" defaultValue={p.repoUrl ?? ""} className="rounded-lg border px-3 py-2 md:col-span-2" />
                <input type="datetime-local" name="publishAt" defaultValue={p.publishAt ? new Date(p.publishAt).toISOString().slice(0, 16) : ""} className="rounded-lg border px-3 py-2 md:col-span-2" />
                <input name="summary" defaultValue={p.summary} className="rounded-lg border px-3 py-2 md:col-span-2" required />
                <textarea name="content" defaultValue={p.content} className="min-h-24 rounded-lg border px-3 py-2 md:col-span-2" required />
                <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
                  <label className="text-sm"><input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured on homepage</label>
                  <label className="text-sm"><input type="checkbox" name="published" defaultChecked={p.published} /> Published</label>
                  <input type="number" min="0" name="featuredOrder" defaultValue={p.featuredOrder} className="rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <SubmitButton idleText="Save Changes" pendingText="Saving..." className="btn-primary disabled:opacity-60" />
                </div>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <form action={toggleProjectPublish}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="published" value={String(p.published)} />
                  <SubmitButton idleText={p.published ? "Move to Draft" : "Publish"} pendingText="Working..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                </form>
                <form action={nudgeFeaturedOrder}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton idleText="Feature ↑" pendingText="..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                </form>
                <form action={nudgeFeaturedOrder}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton idleText="Feature ↓" pendingText="..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                </form>
                {scope === "trash" ? (
                  <>
                    <form action={restoreProject}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton idleText="Restore" pendingText="..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                    </form>
                    <form action={hardDeleteProject}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton
                        idleText="Delete Permanently"
                        pendingText="Deleting..."
                        confirmMessage="Permanently delete this project? This cannot be undone."
                        className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
                      />
                    </form>
                  </>
                ) : (
                  <form action={deleteProject}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton
                      idleText="Move to Trash"
                      pendingText="Moving..."
                      confirmMessage="Move this project to trash?"
                      className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
                    />
                  </form>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      )}

      {panel === "blog" && (
      <section id="blog-cms" className="admin-panel rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Blog CMS</h2>

        <details className="rounded-xl border border-zinc-200 p-4" open>
          <summary className="cursor-pointer text-sm font-medium">Create blog post</summary>
          <form id="create-post-form" action={createPost} className="mt-3 grid gap-3 md:grid-cols-2">
          <SlugHelper titleName="title" slugName="slug" taken={postSlugs} />
          <input name="tags" placeholder="Tags" className="rounded-lg border px-3 py-2" />
          <div className="space-y-2 md:col-span-2">
            <input id="new-post-image-url" type="url" name="imageUrl" placeholder="Cover image URL" className="w-full rounded-lg border px-3 py-2" />
            <ImageUploader targetInputId="new-post-image-url" />
            <UrlImagePreview inputId="new-post-image-url" />
          </div>
          <input name="excerpt" placeholder="Excerpt" className="rounded-lg border px-3 py-2 md:col-span-2" required />
          <input type="datetime-local" name="publishAt" className="rounded-lg border px-3 py-2 md:col-span-2" />
          <LivePreviewTextarea name="content" placeholder="Post content (supports # headings, - bullets, 1. numbered lists)" />
          <label className="text-sm md:col-span-2"><input type="checkbox" name="published" defaultChecked /> Published</label>
          <SubmitButton idleText="Add Post" pendingText="Adding..." className="btn-primary w-fit disabled:opacity-60 md:col-span-2" />
          </form>
          <div className="mt-2"><FormDraftAssist formId="create-post-form" storageKey="admin-create-post-draft" /></div>
        </details>

        <div className="mt-6 rounded-xl border border-zinc-200 p-3">
          <p className="mb-2 text-sm font-medium text-zinc-700">Drag to reorder blog list order</p>
          <form action={savePostSortOrder} className="space-y-3">
            <ReorderList inputName="postOrder" items={posts.map((p) => ({ id: p.id, label: p.title }))} />
            <SubmitButton idleText="Save Post Order" pendingText="Saving..." className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white" />
          </form>
        </div>

        <div className="mt-6 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {posts.length === 0 && <div className="rounded-lg border border-dashed p-3 text-sm text-zinc-500">✍️ No posts match current filter.</div>}
          {posts.map((p) => (
            <details key={p.id} className="rounded-xl border border-zinc-200 p-4" open={false}>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeTone(p.published)}`}>{p.published ? "Published" : "Draft"}</span>
                </div>
                <span className="text-xs text-zinc-500">Updated {new Date(p.updatedAt).toLocaleString()}</span>
              </summary>

              <form action={updatePost} className="mt-4 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={p.id} />
                <SlugHelper titleName="title" slugName="slug" defaultTitle={p.title} defaultSlug={p.slug} taken={postSlugs} />
                <input name="tags" defaultValue={p.tags ?? ""} className="rounded-lg border px-3 py-2" />
                <div className="space-y-2 md:col-span-2">
                  <input id={`post-image-url-${p.id}`} type="url" name="imageUrl" defaultValue={p.imageUrl ?? ""} className="w-full rounded-lg border px-3 py-2" />
                  <ImageUploader targetInputId={`post-image-url-${p.id}`} />
                  <UrlImagePreview inputId={`post-image-url-${p.id}`} />
                </div>
                <input name="excerpt" defaultValue={p.excerpt} className="rounded-lg border px-3 py-2 md:col-span-2" required />
                <input type="datetime-local" name="publishAt" defaultValue={p.publishAt ? new Date(p.publishAt).toISOString().slice(0, 16) : ""} className="rounded-lg border px-3 py-2 md:col-span-2" />
                <textarea name="content" defaultValue={p.content} className="min-h-24 rounded-lg border px-3 py-2 md:col-span-2" required />
                <label className="text-sm md:col-span-2"><input type="checkbox" name="published" defaultChecked={p.published} /> Published</label>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <SubmitButton idleText="Save Changes" pendingText="Saving..." className="btn-primary disabled:opacity-60" />
                </div>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`/blog/${p.slug}?preview=${encodeURIComponent(previewToken)}`} target="_blank" rel="noopener noreferrer" className="rounded border px-3 py-1.5 text-sm">Preview</a>
                <form action={togglePostPublish}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="published" value={String(p.published)} />
                  <SubmitButton idleText={p.published ? "Move to Draft" : "Publish"} pendingText="Working..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                </form>
                {scope === "trash" ? (
                  <>
                    <form action={restorePost}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton idleText="Restore" pendingText="..." className="rounded border px-3 py-1.5 text-sm disabled:opacity-60" />
                    </form>
                    <form action={hardDeletePost}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmSubmitButton
                        idleText="Delete Permanently"
                        pendingText="Deleting..."
                        confirmMessage="Permanently delete this post? This cannot be undone."
                        className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
                      />
                    </form>
                  </>
                ) : (
                  <form action={deletePost}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmitButton
                      idleText="Move to Trash"
                      pendingText="Moving..."
                      confirmMessage="Move this post to trash?"
                      className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
                    />
                  </form>
                )}
              </div>
            </details>
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
