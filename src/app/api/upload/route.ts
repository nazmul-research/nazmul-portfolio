import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const context = String(formData.get("context") || "blog").trim().toLowerCase();
  const kind = context === "profile" ? "profile" : "blog";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }

  const max = 4 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ error: "Image too large (max 4MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const asset = await prisma.mediaAsset.create({ data: { url: dataUrl, kind } });
  return NextResponse.json({ id: asset.id, url: `/api/media/${asset.id}`, rawUrl: asset.url });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.mediaAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
