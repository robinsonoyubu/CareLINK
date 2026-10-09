import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";
import { canManageAttendance } from "@/lib/attendance/access";

const schema = z.object({
  shift_id: z.string().uuid(),
  event_type: z.enum(["clock_in", "clock_out"]),
  reason: z.enum(["camera_failure", "gps_failure", "device_failure", "connectivity_failure", "false_rejection", "other"]),
  supporting_note: z.string().min(10).max(1000),
  occurred_at: z.string().datetime().optional(),
});

/**
 * Fallback when camera/GPS/device/connectivity fails. Only an authorised
 * Attendance Admin can record it, a supporting note is mandatory, and the event
 * stays flagged in the immutable audit log.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const service = await createServiceClient();
  const { data: shift } = await service.from("shifts").select("*").eq("id", d.shift_id).single();
  if (!shift) return badRequest("Shift not found", 404);
  if (!(await canManageAttendance(auth.profile.id, auth.profile.role, shift.organization_id))) {
    return badRequest("You do not have attendance rights for this facility", 403);
  }
  if (d.event_type === "clock_in" && shift.status !== "scheduled") return badRequest("Shift is not awaiting clock-in", 409);
  if (d.event_type === "clock_out" && shift.status !== "in_progress") return badRequest("Shift is not in progress", 409);

  const { data: ev, error } = await service.from("attendance_events").insert({
    shift_id: shift.id,
    professional_id: shift.professional_id,
    organization_id: shift.organization_id,
    site_id: shift.site_id,
    event_type: d.event_type,
    outcome: "manual_exception",
    qr_result: "manual",
    geofence_result: "manual",
    face_result: "manual",
    admin_id: auth.profile.id,
    exception_reason: d.reason,
    supporting_note: d.occurred_at ? `${d.supporting_note} (reported time ${d.occurred_at})` : d.supporting_note,
    flagged: true,
  }).select("id, server_ts").single();
  if (error) return badRequest(error.message, 500);

  const ts = d.occurred_at ?? (ev.server_ts as string);
  if (d.event_type === "clock_in") {
    await service.from("shifts").update({ status: "in_progress", clock_in_at: ts, has_exceptions: true }).eq("id", shift.id);
  } else {
    const minutes = Math.round((new Date(ts).getTime() - new Date(shift.clock_in_at).getTime()) / 60000);
    await service.from("shifts").update({ status: "completed", clock_out_at: ts, duration_minutes: minutes, has_exceptions: true }).eq("id", shift.id);
  }

  const { data: pro } = await service.from("professionals").select("profile_id").eq("id", shift.professional_id).single();
  await notify([pro?.profile_id], {
    type: "attendance", title: "Manual attendance exception recorded",
    message: `Your ${d.event_type.replace("_", "-")} was recorded manually (${d.reason.replace(/_/g, " ")}). It is flagged for audit.`,
    link_url: "/attendance",
  });
  return NextResponse.json({ ok: true, event_id: ev.id }, { status: 201 });
}
