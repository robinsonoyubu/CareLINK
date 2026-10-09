import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";
import { verifyQrToken } from "@/lib/attendance/qr";
import { checkGeofence } from "@/lib/attendance/geofence";
import { verifyFace } from "@/lib/attendance/face";
import { evaluateAttendance, explainReasons } from "@/lib/attendance/evaluate";

const schema = z.object({
  shift_id: z.string().uuid(),
  event_type: z.enum(["clock_in", "clock_out"]),
  qr_token: z.string().min(10).max(2000),
  location: z.object({ lat: z.number(), lng: z.number(), accuracy: z.number() }),
  live_capture: z.string().min(100).max(4_000_000), // base64 JPEG from the live camera
  device: z.object({ platform: z.string().max(60).optional(), app_version: z.string().max(30).optional(), session_id: z.string().max(80).optional() }).default({}),
});

/** Early/late allowance around the scheduled shift. */
const WINDOW_MS = 2 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const service = await createServiceClient();
  const { data: pro } = await service.from("professionals").select("id").eq("profile_id", auth.profile.id).single();
  if (!pro) return badRequest("Only assigned staff can clock in", 403);

  const { data: shift } = await service.from("shifts").select("*").eq("id", d.shift_id).single();
  if (!shift || shift.professional_id !== pro.id) return badRequest("Shift not found", 404);

  const now = Date.now();
  if (d.event_type === "clock_in") {
    if (shift.status !== "scheduled") return badRequest("This shift is not awaiting clock-in", 409);
    if (now < new Date(shift.starts_at).getTime() - WINDOW_MS || now > new Date(shift.ends_at).getTime()) {
      return badRequest("Clock-in is only open around your scheduled shift time", 409);
    }
  } else if (shift.status !== "in_progress") {
    return badRequest("You are not clocked in to this shift", 409);
  }

  const { data: site } = await service.from("facility_sites").select("*").eq("id", shift.site_id).single();
  if (!site) return badRequest("Site not found", 404);

  // Layer 1: dynamic QR bound to this facility + site.
  let qr = verifyQrToken(d.qr_token, { organizationId: shift.organization_id, siteId: shift.site_id });
  if (qr.ok) {
    const { data: used } = await service.from("attendance_events").select("id")
      .eq("professional_id", pro.id).eq("qr_nonce", qr.payload.nonce).eq("event_type", d.event_type).eq("outcome", "accepted").maybeSingle();
    if (used) qr = { ok: false, reason: "replayed" };
  }

  // Layer 2: geofence.
  const geo = checkGeofence(
    { lat: site.lat, lng: site.lng, radiusM: site.radius_m, maxAccuracyM: site.max_accuracy_m },
    { lat: d.location.lat, lng: d.location.lng, accuracyM: d.location.accuracy }
  );

  // Layer 3: facial + liveness (only attempted when the cheaper checks pass, to limit biometric processing).
  const { data: enrollment } = await service.from("face_enrollments").select("reference_image_path").eq("professional_id", pro.id).maybeSingle();
  const face = qr.ok && geo.status === "inside"
    ? await verifyFace({ professionalId: pro.id, referenceImagePath: enrollment?.reference_image_path ?? null, liveCaptureBase64: d.live_capture })
    : null;

  const verdict = evaluateAttendance(qr, geo, face);
  const reasons = verdict.reasons;

  const event = {
    shift_id: shift.id,
    professional_id: pro.id,
    organization_id: shift.organization_id,
    site_id: shift.site_id,
    event_type: d.event_type,
    outcome: verdict.accepted ? "accepted" : "rejected",
    qr_result: qr.ok ? "valid" : qr.reason,
    qr_nonce: qr.ok ? qr.payload.nonce : null,
    geofence_result: geo.status,
    distance_m: "distanceM" in geo ? geo.distanceM : null,
    accuracy_m: d.location.accuracy,
    face_result: face?.status ?? "not_attempted",
    face_score: face?.score ?? null,
    liveness_score: face?.livenessScore ?? null,
    device_info: d.device,
    rejection_reasons: reasons,
    flagged: !verdict.accepted,
  };

  const { data: inserted, error } = await service.from("attendance_events").insert(event).select("id, server_ts").single();
  if (error) {
    // Unique index hit = concurrent replay of the same code.
    if (error.code === "23505") return badRequest({ reasons: explainReasons(["qr_replayed"]) }, 409);
    return badRequest(error.message, 500);
  }

  if (!verdict.accepted) {
    return NextResponse.json({ accepted: false, reasons: explainReasons(reasons), event_id: inserted.id }, { status: 422 });
  }

  const ts = inserted.server_ts as string;
  if (d.event_type === "clock_in") {
    await service.from("shifts").update({ status: "in_progress", clock_in_at: ts }).eq("id", shift.id);
  } else {
    const minutes = Math.round((new Date(ts).getTime() - new Date(shift.clock_in_at).getTime()) / 60000);
    await service.from("shifts").update({ status: "completed", clock_out_at: ts, duration_minutes: minutes }).eq("id", shift.id);
  }
  await notify([auth.profile.id], {
    type: "attendance",
    title: d.event_type === "clock_in" ? "Clocked in" : "Clocked out",
    message: `${site.name} at ${new Date(ts).toLocaleTimeString("en-NG")}`,
    link_url: "/attendance",
  });
  return NextResponse.json({ accepted: true, server_ts: ts, event_id: inserted.id });
}
