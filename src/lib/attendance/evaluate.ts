import type { QrVerification } from "./qr";
import type { GeofenceResult } from "./geofence";
import type { FaceResult } from "./face";

/**
 * All three layers must pass for an automatic clock event. Any failure is
 * recorded as a rejected attempt with reasons; only an authorised Attendance
 * Admin can then record a manual exception.
 */
export function evaluateAttendance(qr: QrVerification, geo: GeofenceResult, face: FaceResult | null) {
  const reasons: string[] = [];
  if (!qr.ok) reasons.push(`qr_${qr.reason}`);
  if (geo.status !== "inside") reasons.push(`geofence_${geo.status}`);
  // `null` = face check not attempted because an earlier layer already failed.
  if (face && face.status !== "match") reasons.push(`face_${face.status}`);
  return { accepted: reasons.length === 0 && face?.status === "match", reasons };
}

const REASON_TEXT: Record<string, string> = {
  qr_expired: "The QR code has expired. Scan the code currently on the facility screen.",
  qr_bad_signature: "This QR code is not a valid MedLINK attendance code.",
  qr_malformed: "This QR code is not a valid MedLINK attendance code.",
  qr_not_yet_valid: "This QR code is not valid yet. Check your device clock.",
  qr_wrong_facility: "This QR code belongs to a different facility.",
  qr_wrong_site: "This QR code belongs to a different site.",
  qr_replayed: "This QR code has already been used. Scan the current code.",
  geofence_outside: "You appear to be outside the facility boundary.",
  geofence_low_accuracy: "Your location accuracy is too low. Move near a window or outdoors and retry.",
  geofence_invalid_reading: "We could not read your location. Enable location services and retry.",
  face_no_match: "Face verification did not match your enrolled reference.",
  face_liveness_failed: "Liveness check failed. Use the live camera, not a photo.",
  face_not_enrolled: "You have no facial reference enrolled. Contact RGH.",
  face_not_configured: "Facial verification is not available. Ask your Attendance Admin to record a manual exception.",
  face_error: "Facial verification is temporarily unavailable. Retry, or ask your Attendance Admin.",
};

export function explainReasons(reasons: string[]) {
  return reasons.map((r) => REASON_TEXT[r] ?? r);
}
