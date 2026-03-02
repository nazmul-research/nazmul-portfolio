import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asObject(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (!session?.user || role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    dryRun?: boolean;
    payload?: {
      data?: {
        siteSettings?: unknown;
        projects?: Array<Record<string, unknown>>;
        posts?: Array<Record<string, unknown>>;
        publications?: Array<Record<string, unknown>>;
      };
    };
  } | null;

  if (!body?.payload?.data) {
    return NextResponse.json({ error: "Invalid backup payload" }, { status: 400 });
  }

  const data = body.payload.data;
  const summary = {
    siteSettings: data.siteSettings ? 1 : 0,
    projects: data.projects?.length || 0,
    posts: data.posts?.length || 0,
    publications: data.publications?.length || 0,
  };

  if (body.dryRun !== false) {
    return NextResponse.json({ ok: true, dryRun: true, summary });
  }

  await prisma.$transaction(async (tx) => {
    const siteSettings = asObject(data.siteSettings);
    if (Object.keys(siteSettings).length) {
      const createPayload: Record<string, unknown> = { id: "main" };
      for (const [k, v] of Object.entries(siteSettings)) {
        if (k !== "id") createPayload[k] = v;
      }

      await tx.siteSettings.upsert({
        where: { id: "main" },
        update: siteSettings as never,
        create: createPayload as never,
      });
    }

    if (Array.isArray(data.projects)) {
      for (const item of data.projects) {
        const id = String(item.id || "").trim();
        if (!id) continue;
        await tx.project.upsert({ where: { id }, update: item as never, create: item as never });
      }
    }

    if (Array.isArray(data.posts)) {
      for (const item of data.posts) {
        const id = String(item.id || "").trim();
        if (!id) continue;
        await tx.post.upsert({ where: { id }, update: item as never, create: item as never });
      }
    }

    if (Array.isArray(data.publications)) {
      for (const item of data.publications) {
        const id = String(item.id || "").trim();
        if (!id) continue;
        await tx.publication.upsert({ where: { id }, update: item as never, create: item as never });
      }
    }
  });

  return NextResponse.json({ ok: true, dryRun: false, summary });
}
