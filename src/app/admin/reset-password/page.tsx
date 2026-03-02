import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/lib/password-reset";

async function resetPassword(formData: FormData) {
  "use server";
  const token = String(formData.get("token") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token || newPassword.length < 8 || newPassword !== confirmPassword) {
    redirect(`/admin/reset-password?token=${encodeURIComponent(token)}&status=invalid`);
  }

  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    redirect("/admin/reset-password?status=expired");
  }

  const nextHash = await hashPassword(newPassword);
  await prisma.adminUser.update({
    where: { email: row.email },
    data: { password: nextHash, passwordUpdatedAt: new Date(), sessionVersion: { increment: 1 } },
  });

  await prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
  redirect("/admin/login?reset=success");
}

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const token = typeof sp.token === "string" ? sp.token : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-6">
      <form action={resetPassword} className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Reset Password</h1>
        <input type="hidden" name="token" value={token} />
        <input name="newPassword" type="password" placeholder="New password (min 8 chars)" className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" required />
        <input name="confirmPassword" type="password" placeholder="Confirm new password" className="mt-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" required />
        <button className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-white">Reset password</button>
        {status === "invalid" && <p className="mt-3 text-sm text-red-600">Invalid input or password mismatch.</p>}
        {status === "expired" && <p className="mt-3 text-sm text-red-600">Reset link is invalid or expired.</p>}
      </form>
    </main>
  );
}
