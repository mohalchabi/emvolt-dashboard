import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// Re-exported so server code has one import for both, while anything that
// reaches the browser takes the constant from lib/password-policy directly.
export { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

/**
 * Password hashing for the handful of staff who can't sign in with Google.
 *
 * scrypt comes with Node, so this adds no dependency and nothing to keep
 * patched. Next 16's Proxy runs on the Node.js runtime, so it is reachable
 * from every place auth is, which an edge runtime would not have allowed.
 *
 * The parameters are stored alongside each hash rather than read from here at
 * verification time, so raising them later doesn't lock out everyone whose
 * password was set under the old ones.
 */
// promisify picks the callback overload without options, so the cost
// parameters are named here for it.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

const KEY_LENGTH = 64;
// 128 * N * r = 16 MB per hash, inside Node's 32 MB default for scrypt.
const PARAMS = { N: 16384, r: 8, p: 1 } as const;

function encode(salt: Buffer, key: Buffer): string {
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  // Normalised so a password typed with a different Unicode composition —
  // easy with an Arabic keyboard — still matches what was stored.
  const key = await scryptAsync(plain.normalize("NFKC"), salt, KEY_LENGTH, { ...PARAMS });
  return encode(salt, key);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const key = await scryptAsync(plain.normalize("NFKC"), salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * A hash of nothing anyone knows, to verify against when the email doesn't
 * match an account. Without it a wrong address would answer noticeably faster
 * than a wrong password, which tells an attacker which addresses are real.
 * Built once on first use rather than at import, so it costs nothing on a
 * cold start that never sees a password login.
 */
let decoyHash: Promise<string> | null = null;
export function decoyPasswordHash(): Promise<string> {
  decoyHash ??= hashPassword(randomBytes(32).toString("hex"));
  return decoyHash;
}
