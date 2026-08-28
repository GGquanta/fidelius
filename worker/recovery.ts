import { decryptJson, encryptJson, randomBytes, timingSafeEqual } from "./crypto";
import { RECOVERY_CODE_COUNT, keys, nowIso } from "./types";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface RecoveryPayload {
  hashes: string[];
  generatedAt: string;
}

function bytesToCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += CROCKFORD[(value << (5 - bits)) & 31];
  return output;
}

export function formatRecoveryCode(normalized: string): string {
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}

export function normalizeRecoveryCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export function isRecoveryCodeShape(input: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(normalizeRecoveryCode(input));
}

export function generateRecoveryCodes(): string[] {
  const codes = new Set<string>();
  while (codes.size < RECOVERY_CODE_COUNT) {
    const raw = bytesToCrockford(randomBytes(5)).slice(0, 8);
    codes.add(formatRecoveryCode(raw));
  }
  return [...codes];
}

export async function hashRecoveryCode(userId: string, code: string): Promise<string> {
  const normalized = normalizeRecoveryCode(code);
  const data = new TextEncoder().encode(`${userId}:${normalized}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function issueRecoveryCodes(
  env: Env,
  userId: string,
  master: CryptoKey,
): Promise<string[]> {
  const codes = generateRecoveryCodes();
  const hashes = await Promise.all(codes.map((code) => hashRecoveryCode(userId, code)));
  const payload: RecoveryPayload = { hashes, generatedAt: nowIso() };
  await env.FIDELIUS.put(keys.recovery(userId), await encryptJson(master, payload));
  return codes;
}

export async function countRecoveryRemaining(env: Env, userId: string, master: CryptoKey): Promise<number> {
  const packed = await env.FIDELIUS.get(keys.recovery(userId));
  if (!packed) return 0;
  try {
    const payload = await decryptJson<RecoveryPayload>(master, packed);
    return payload.hashes.length;
  } catch {
    return 0;
  }
}

export async function consumeRecoveryCode(
  env: Env,
  userId: string,
  master: CryptoKey,
  code: string,
): Promise<boolean> {
  if (!isRecoveryCodeShape(code)) return false;
  const packed = await env.FIDELIUS.get(keys.recovery(userId));
  if (!packed) return false;
  const payload = await decryptJson<RecoveryPayload>(master, packed);
  const candidate = await hashRecoveryCode(userId, code);
  let hit = -1;
  let matched = false;
  for (let i = 0; i < payload.hashes.length; i += 1) {
    if (timingSafeEqual(payload.hashes[i], candidate)) {
      matched = true;
      hit = i;
    }
  }
  if (!matched) return false;
  payload.hashes.splice(hit, 1);
  if (payload.hashes.length === 0) {
    await env.FIDELIUS.delete(keys.recovery(userId));
  } else {
    await env.FIDELIUS.put(keys.recovery(userId), await encryptJson(master, payload));
  }
  return true;
}
