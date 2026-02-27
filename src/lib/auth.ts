import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authenticator } from "otplib";
import { consumeRecoveryCode } from "@/lib/recovery-codes";

const LOCK_MINUTES = 15;
const MAX_FAILED = 5;
const PASSWORD_MAX_AGE_DAYS = 90;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        recoveryCode: { label: "Recovery Code", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        const otp = String(credentials?.otp || "").trim().replace(/\s+/g, "");
        const recoveryCode = String(credentials?.recoveryCode || "").trim().toUpperCase();

        if (!email || !password) return null;

        const now = new Date();
        const throttle = await prisma.loginThrottle.upsert({ where: { email }, update: {}, create: { email } });

        if (throttle.lockUntil && throttle.lockUntil > now) return null;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (user?.active && (await verifyPassword(password, user.password))) {
          if (user.role === "owner" && user.totpEnabled) {
            let twoFaOk = false;

            if (user.totpSecret && otp) {
              twoFaOk = authenticator.verify({ token: otp, secret: user.totpSecret });
            }

            if (!twoFaOk && recoveryCode) {
              const consumed = await consumeRecoveryCode(recoveryCode, user.recoveryCodesHash);
              if (consumed.ok) {
                twoFaOk = true;
                await prisma.adminUser.update({ where: { id: user.id }, data: { recoveryCodesHash: consumed.nextJson } });
              }
            }

            if (!twoFaOk) {
              const nextFailed = throttle.failedCount + 1;
              const lockUntil = nextFailed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : null;
              await prisma.loginThrottle.update({ where: { email }, data: { failedCount: nextFailed, lockUntil } });
              return null;
            }
          }

          await prisma.loginThrottle.update({ where: { email }, data: { failedCount: 0, lockUntil: null } });

          const ageMs = now.getTime() - new Date(user.passwordUpdatedAt).getTime();
          const passwordExpired = ageMs > PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            passwordExpired,
            sessionVersion: user.sessionVersion,
          } as unknown as { id: string; name: string; email: string; role: string; passwordExpired: boolean; sessionVersion: number };
        }

        if (email === String(process.env.ADMIN_EMAIL || "").trim().toLowerCase() && password === process.env.ADMIN_PASSWORD) {
          await prisma.loginThrottle.update({ where: { email }, data: { failedCount: 0, lockUntil: null } });

          return { id: "env-admin", name: "Owner", email, role: "owner", passwordExpired: false, sessionVersion: 0 } as unknown as {
            id: string;
            name: string;
            email: string;
            role: string;
            passwordExpired: boolean;
            sessionVersion: number;
          };
        }

        const nextFailed = throttle.failedCount + 1;
        const lockUntil = nextFailed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) : null;
        await prisma.loginThrottle.update({ where: { email }, data: { failedCount: nextFailed, lockUntil } });

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role?: string; passwordExpired?: boolean; sessionVersion?: number };
        (token as Record<string, unknown>).role = u.role || "editor";
        (token as Record<string, unknown>).passwordExpired = Boolean(u.passwordExpired);
        (token as Record<string, unknown>).sessionVersion = Number(u.sessionVersion || 0);
        return token;
      }

      const email = token.email;
      if (email && token.sub !== "env-admin") {
        const dbUser = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
        const tokenSv = Number((token as Record<string, unknown>).sessionVersion || 0);

        if (!dbUser || !dbUser.active || dbUser.sessionVersion !== tokenSv) {
          delete token.email;
          delete token.name;
          delete token.sub;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.email && session.user) {
        session.user.email = null;
      }

      const role = (token as Record<string, unknown>).role;
      const passwordExpired = (token as Record<string, unknown>).passwordExpired;
      if (session.user) {
        (session.user as Record<string, unknown>).role = typeof role === "string" ? role : "editor";
        (session.user as Record<string, unknown>).passwordExpired = Boolean(passwordExpired);
      }
      return session;
    },
  },
};
