"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetOk] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("reset") === "success";
  });

;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "");
    const password = String(f.get("password") || "");
    const otp = String(f.get("otp") || "");
    const recoveryCode = String(f.get("recoveryCode") || "");

    const res = await signIn("credentials", { email, password, otp, recoveryCode, redirect: false, callbackUrl: "/admin" });
    if (res?.ok && res.url) window.location.href = res.url;
    else setError("Login failed. Check credentials / 2FA.");
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your portfolio content</p>

        <input name="email" type="email" placeholder="Email" className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" required />

        <div className="mt-3 flex gap-2">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <details className="mt-3 rounded-lg border border-zinc-200 p-3">
          <summary className="cursor-pointer text-sm text-zinc-600">Use 2FA / recovery (if enabled)</summary>
          <div className="mt-3 space-y-3">
            <input name="otp" type="text" inputMode="numeric" placeholder="Authenticator code" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" />
            <input name="recoveryCode" type="text" placeholder="Recovery code" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" />
          </div>
        </details>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {resetOk && <p className="mt-2 text-sm text-emerald-600">Password reset successful. Please sign in.</p>}
        <button className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-white">Sign in</button>
        <a href="/admin/forgot-password" className="mt-3 block text-center text-sm text-zinc-600 underline">Forgot password?</a>
      </form>
    </main>
  );
}
