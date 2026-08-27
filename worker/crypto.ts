function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function importMasterKey(secret: string): Promise<CryptoKey> {
  const raw = base64ToBytes(secret);
  if (raw.byteLength !== 32) {
    throw new Error("MASTER_KEY must be 32 bytes, base64 encoded");
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function aesEncrypt(key: CryptoKey, plaintext: Uint8Array): Promise<string> {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const packed = new Uint8Array(iv.byteLength + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.byteLength);
  return bytesToBase64(packed);
}

async function aesDecrypt(key: CryptoKey, packedB64: string): Promise<Uint8Array> {
  const packed = base64ToBytes(packedB64);
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new Uint8Array(plain);
}

export async function encryptJson(masterKey: CryptoKey, value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return aesEncrypt(masterKey, encoded);
}

export async function decryptJson<T>(masterKey: CryptoKey, packedB64: string): Promise<T> {
  const plain = await aesDecrypt(masterKey, packedB64);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export async function encryptSecrets(
  masterKey: CryptoKey,
  secrets: Record<string, string>,
): Promise<{ wrappedDek: string; secretsCipher: string }> {
  const dekRaw = randomBytes(32);
  const dek = await crypto.subtle.importKey("raw", dekRaw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  const secretsCipher = await encryptJson(dek, secrets);
  const wrappedDek = await aesEncrypt(masterKey, dekRaw);
  return { wrappedDek, secretsCipher };
}

export async function decryptSecrets(
  masterKey: CryptoKey,
  wrappedDek: string,
  secretsCipher: string,
): Promise<Record<string, string>> {
  const dekRaw = await aesDecrypt(masterKey, wrappedDek);
  const dek = await crypto.subtle.importKey("raw", dekRaw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return decryptJson<Record<string, string>>(dek, secretsCipher);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.byteLength !== right.byteLength) {
    let acc = 0;
    for (const byte of left) acc |= byte;
    return acc === -1;
  }
  let diff = 0;
  for (let i = 0; i < left.byteLength; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}
