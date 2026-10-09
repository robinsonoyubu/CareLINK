import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Dynamic attendance QR tokens.
 *
 * A facility screen requests a fresh token every few seconds. Each token is
 * HMAC-signed by the server and bound to a facility + site, carries its own
 * issue time and a random nonce, and expires after `ttlSeconds`. Staff scan it
 * in MedLINK and submit it with their clock-in/out; the server re-verifies the
 * signature, expiry and binding, and records the nonce per staff/event so the
 * same code cannot be replayed.
 */

export const QR_PREFIX = "MLQR1";
export const DEFAULT_QR_TTL_SECONDS = 30;
/** Small allowance for clock drift between the facility screen and the server. */
const CLOCK_SKEW_SECONDS = 5;

export interface QrPayload {
  organizationId: string;
  siteId: string;
  issuedAt: number; // unix seconds (server time)
  ttl: number; // seconds
  nonce: string;
}

export type QrVerification =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "not_yet_valid" | "wrong_facility" | "wrong_site" | "replayed" };

function getSecret(secret?: string) {
  const s = secret ?? process.env.ATTENDANCE_QR_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ATTENDANCE_QR_SECRET must be set to at least 32 characters");
  }
  return s;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function issueQrToken(
  args: { organizationId: string; siteId: string; ttl?: number; now?: number },
  secret?: string
): { token: string; payload: QrPayload } {
  const payload: QrPayload = {
    organizationId: args.organizationId,
    siteId: args.siteId,
    issuedAt: args.now ?? Math.floor(Date.now() / 1000),
    ttl: args.ttl ?? DEFAULT_QR_TTL_SECONDS,
    nonce: randomBytes(12).toString("base64url"),
  };
  const body = b64url(JSON.stringify(payload));
  return { token: `${QR_PREFIX}.${body}.${sign(body, getSecret(secret))}`, payload };
}

export function verifyQrToken(
  token: string,
  expected: { organizationId: string; siteId?: string; now?: number },
  secret?: string
): QrVerification {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== QR_PREFIX) return { ok: false, reason: "malformed" };
  const [, body, sig] = parts;

  const expectedSig = Buffer.from(sign(body, getSecret(secret)));
  const givenSig = Buffer.from(sig);
  if (expectedSig.length !== givenSig.length || !timingSafeEqual(expectedSig, givenSig)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: QrPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!payload?.organizationId || !payload.siteId || !payload.nonce || typeof payload.issuedAt !== "number") {
    return { ok: false, reason: "malformed" };
  }

  const now = expected.now ?? Math.floor(Date.now() / 1000);
  if (payload.issuedAt - CLOCK_SKEW_SECONDS > now) return { ok: false, reason: "not_yet_valid" };
  if (now > payload.issuedAt + payload.ttl + CLOCK_SKEW_SECONDS) return { ok: false, reason: "expired" };
  if (payload.organizationId !== expected.organizationId) return { ok: false, reason: "wrong_facility" };
  if (expected.siteId && payload.siteId !== expected.siteId) return { ok: false, reason: "wrong_site" };

  return { ok: true, payload };
}
