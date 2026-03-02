import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || (role !== "owner" && role !== "editor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [siteSettings, projects, posts, publications, mediaAssets, adminUsers, auditLogs] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "main" } }),
    prisma.project.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.post.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.publication.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        totpEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" }, take: 2000 }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      siteSettings,
      projects,
      posts,
      publications,
      mediaAssets,
      adminUsers,
      auditLogs,
    },
  };

  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nazmul-cms-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
