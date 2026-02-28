import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset?.url) return new NextResponse("Not found", { status: 404 });

  const m = asset.url.match(/^data:([a-zA-Z0-9.+\/-]+);base64,(.+)$/);
  if (!m) return new NextResponse("Invalid media", { status: 400 });

  const contentType = m[1];
  const base64 = m[2];
  const bytes = Buffer.from(base64, "base64");

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
