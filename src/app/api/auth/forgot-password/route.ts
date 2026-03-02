import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken, hashResetToken } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: true });

    const token = generateResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({ data: { email, tokenHash, expiresAt } });
    return NextResponse.json({ ok: true, resetUrl: `/admin/reset-password?token=${encodeURIComponent(token)}` });
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
