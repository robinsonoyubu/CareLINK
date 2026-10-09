import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { notify } from "@/lib/medlink/server";

const schema = z.object({
  status: z.enum(["pending", "active", "completed", "cancelled"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const service = await createServiceClient();
  // RGH Assignment → Facility Verification → Staff Assigned → Service Delivery
  const stage = { pending: "rgh_review", active: "facility_verification", completed: "completed", cancelled: "cancelled" }[parsed.data.status];
  const { data: assignment, error } = await service.from("assignments")
    .update({ status: parsed.data.status, stage } as never).eq("id", id)
    .select("id, title, professional_id, organization_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (assignment?.professional_id && assignment.organization_id) {
    if (parsed.data.status === "active") {
      await service.from("facility_staff").upsert(
        { organization_id: assignment.organization_id, professional_id: assignment.professional_id, assignment_id: assignment.id, facility_status: "active", facility_verified_at: null },
        { onConflict: "organization_id,professional_id" }
      );
      await service.from("professionals").update({ workforce_status: "assigned" }).eq("id", assignment.professional_id);
      const { data: org } = await service.from("organizations").select("profile_id").eq("id", assignment.organization_id).single();
      await notify([org?.profile_id], {
        type: "assignment", title: "Staff assigned by RGH",
        message: `${assignment.title}: please verify the professional on arrival in Facility Attendance → Workforce.`,
        link_url: "/attendance/facility",
      });
    } else if (parsed.data.status === "completed" || parsed.data.status === "cancelled") {
      await service.from("facility_staff").update({ facility_status: "inactive" })
        .eq("organization_id", assignment.organization_id).eq("professional_id", assignment.professional_id);
      await service.from("professionals").update({ workforce_status: parsed.data.status === "completed" ? "contract_completed" : "available" })
        .eq("id", assignment.professional_id);
    }
  }

  return NextResponse.json({ ok: true });
}
