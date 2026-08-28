import { randomBytes, timingSafeEqual } from "./crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32ToBytes(input: string): Uint8Array {
  const normalized = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = remaining & 255;
    remaining = Math.floor(remaining / 256);
  }
  return bytes;
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counterToBytes(counter)),
  );
  const offset = signature[signature.length - 1] & 15;
  const bin =
    ((signature[offset] & 127) << 24) |
    ((signature[offset + 1] & 255) << 16) |
    ((signature[offset + 2] & 255) << 8) |
    (signature[offset + 3] & 255);
  return String(bin % 1_000_000).padStart(6, "0");
}

export function newTotpSecret(): string {
  return bytesToBase32(randomBytes(20));
}

export function otpauthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`Fidelius:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Fidelius&digits=6&period=30`;
}

export async function generateTotp(
  secretBase32: string,
  atMs: number = Date.now(),
): Promise<string> {
  const counter = Math.floor(atMs / 1000 / 30);
  return hotp(base32ToBytes(secretBase32), counter);
}

export async function verifyTotp(secretBase32: string, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (!/^\d{6}$/.test(trimmed)) return false;
  const now = Math.floor(Date.now() / 1000 / 30);
  const secret = base32ToBytes(secretBase32);
  for (let delta = -1; delta <= 1; delta += 1) {
    const candidate = await hotp(secret, now + delta);
    if (timingSafeEqual(candidate, trimmed)) return true;
  }
  return false;
}

export const DEV_TOTP_BYPASS_CODE = "000000";

export function isDevTotpBypass(env: Env, code: string): boolean {
  if (String(env.ENVIRONMENT) === "production") return false;
  const flag = String((env as unknown as Record<string, unknown>).DEV_TOTP_BYPASS ?? "").trim();
  if (!flag) return false;
  return code.trim() === DEV_TOTP_BYPASS_CODE;
}

export async function verifyTotpOrBypass(
  env: Env,
  secretBase32: string,
  code: string,
): Promise<boolean> {
  if (isDevTotpBypass(env, code)) return true;
  return verifyTotp(secretBase32, code);
}
