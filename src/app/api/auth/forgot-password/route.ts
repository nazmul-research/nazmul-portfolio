import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken, hashResetToken } from "@/lib/password-reset";
import { sendResetEmail } from "@/lib/reset-email";

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

    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const resetUrl = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendResetEmail({ to: email, resetUrl });
      return NextResponse.json({ ok: true, emailed: true });
    } catch {
      return NextResponse.json({ ok: true, emailed: false, resetUrl });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
