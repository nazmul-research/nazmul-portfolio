import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const role = (session.user as Record<string, unknown>).role;
  return {
    email: session.user.email,
    role: typeof role === "string" ? role : "editor",
  };
}

export async function writeAuditLog(input: {
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: string | null;
}) {
  const actor = await requireAdmin();
  await prisma.auditLog.create({
    data: {
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId || null,
      meta: input.meta || null,
    },
  });
}
