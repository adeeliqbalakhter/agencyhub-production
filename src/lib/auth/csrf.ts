import { randomBytes, createHash } from "crypto";

const CSRF_SECRET =
  process.env.CSRF_SECRET ||
  process.env.AUTH_SECRET ||
  "fallback-secret-change-in-production";

/**
 * Generates a CSRF token pair.
 *
 * @returns An object with:
 *   - `token`: The full token to send in the `x-csrf-token` header (format: "random.hash")
 *   - `cookie`: The hash portion to store in the `csrf_token` cookie
 */
export function generateCsrfToken(): { token: string; cookie: string } {
  const secret = CSRF_SECRET;
  const random = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(`${random}${secret}`).digest("hex");
  return {
    token: `${random}.${hash}`,
    cookie: hash,
  };
}

/**
 * Validates a CSRF token by re-computing the expected hash.
 *
 * @param token - The full token from the `x-csrf-token` header (format: "random.hash")
 * @returns `true` if the token is valid
 */
export function validateCsrfToken(token: string): boolean {
  const [random, hash] = token.split(".");
  if (!random || !hash) return false;
  const secret = CSRF_SECRET;
  const expected = createHash("sha256")
    .update(`${random}${secret}`)
    .digest("hex");
  return hash === expected;
}
