import { createHmac, timingSafeEqual } from "node:crypto";

/** Plan updates are fresh for 5 minutes; a link grant for 10 (it waits on a person in Console). */
export const SYNC_WINDOW_SECONDS = 300;
export const GRANT_WINDOW_SECONDS = 600;

/**
 * `HMAC-SHA256(secret, "<prefix><unix-seconds>.<body>")` in hex, the scheme NEXORA Core uses
 * for Vigilo too. The prefix separates message kinds signed with the same secret: plan updates
 * have none, link grants use `link.`, so one can never be replayed as the other.
 */
export function sign(secret: string, timestamp: number, body: string, prefix = ""): string {
  return createHmac("sha256", secret).update(`${prefix}${timestamp}.${body}`).digest("hex");
}

/**
 * Checks a signature over the exact bytes received, in constant time, within a replay window.
 * Every failure returns false the same way, so a caller cannot learn which check failed.
 */
export function verify(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  windowSeconds: number;
  prefix?: string;
  now?: number;
}): boolean {
  const { secret, timestamp, signature, body, windowSeconds, prefix = "" } = input;
  if (!timestamp || !signature || !/^\d{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const seconds = Number(timestamp);
  const now = (input.now ?? Date.now()) / 1000;
  if (Math.abs(now - seconds) > windowSeconds) return false;
  const expected = Buffer.from(sign(secret, seconds, body, prefix), "hex");
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
