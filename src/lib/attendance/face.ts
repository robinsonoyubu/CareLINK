/**
 * Facial / liveness verification adapter.
 *
 * MedLINK does not implement face matching itself. A licensed provider is
 * plugged in via FACE_VERIFICATION_API_URL / FACE_VERIFICATION_API_KEY. The
 * provider receives the live capture plus the enrolled reference and must
 * return a liveness decision and a match decision. Without a configured
 * provider every check returns `not_configured`, which blocks automatic
 * clock-in — a static photo is never accepted on its own.
 */

export type FaceStatus = "match" | "no_match" | "liveness_failed" | "not_enrolled" | "not_configured" | "error";

export interface FaceResult {
  status: FaceStatus;
  score?: number;
  livenessScore?: number;
  providerRef?: string;
}

export async function verifyFace(args: {
  professionalId: string;
  referenceImagePath: string | null;
  liveCaptureBase64: string;
}): Promise<FaceResult> {
  if (!args.referenceImagePath) return { status: "not_enrolled" };

  const url = process.env.FACE_VERIFICATION_API_URL;
  const key = process.env.FACE_VERIFICATION_API_KEY;
  if (!url || !key) return { status: "not_configured" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        subject_id: args.professionalId,
        reference_image_path: args.referenceImagePath,
        live_image_base64: args.liveCaptureBase64,
        require_liveness: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { status: "error" };
    const data = (await res.json()) as {
      liveness_passed?: boolean;
      liveness_score?: number;
      match?: boolean;
      score?: number;
      reference?: string;
    };
    const base = { score: data.score, livenessScore: data.liveness_score, providerRef: data.reference };
    if (!data.liveness_passed) return { status: "liveness_failed", ...base };
    return { status: data.match ? "match" : "no_match", ...base };
  } catch {
    return { status: "error" };
  }
}
