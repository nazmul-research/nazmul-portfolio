import { hashPassword, verifyPassword } from "@/lib/password";

function randomCode() {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${chunk()}-${chunk()}-${chunk()}`;
}

export function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => randomCode());
}

export async function hashRecoveryCodes(codes: string[]) {
  const hashes = await Promise.all(codes.map((c) => hashPassword(c)));
  return JSON.stringify(hashes);
}

export async function consumeRecoveryCode(inputCode: string, storedJson: string | null | undefined) {
  if (!storedJson) return { ok: false, nextJson: storedJson ?? null };

  let hashes: string[] = [];
  try {
    hashes = JSON.parse(storedJson) as string[];
  } catch {
    return { ok: false, nextJson: storedJson };
  }

  for (let i = 0; i < hashes.length; i++) {
    const ok = await verifyPassword(inputCode, hashes[i]);
    if (ok) {
      const next = hashes.filter((_, idx) => idx !== i);
      return { ok: true, nextJson: JSON.stringify(next), remaining: next.length };
    }
  }

  return { ok: false, nextJson: storedJson, remaining: hashes.length };
}
