import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { generateResetToken, hashResetToken } from "@/lib/password-reset";

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/admin/forgot-password?status=invalid");

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) redirect("/admin/forgot-password?status=sent");

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordResetToken.create({ data: { email, tokenHash, expiresAt } });
  redirect(`/admin/forgot-password?status=sent&token=${token}`);
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const status = typeof sp.status === "string" ? sp.status : "";
  const token = typeof sp.token === "string" ? sp.token : "";

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-6">
      <form action={requestReset} className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot Password</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter your admin email to generate a reset link.</p>
        <input name="email" type="email" placeholder="Email" className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" required />
        <button className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-white">Generate reset link</button>
        {status === "sent" && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
            Reset request processed.
            {token && <div className="mt-2"><a href={`/admin/reset-password?token=${encodeURIComponent(token)}`} className="underline">Open reset page</a></div>}
          </div>
        )}
      </form>
    </main>
  );
}
