import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";

const schema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().email(),
  member_role: z.enum(["org_admin", "attendance_admin"]),
});

async function isOrgAdmin(profileId: string, role: string, orgId: string) {
  if (role === "admin") return true;
  const service = await createServiceClient();
  const [{ data: owner }, { data: member }] = await Promise.all([
    service.from("organizations").select("id").eq("id", orgId).eq("profile_id", profileId).maybeSingle(),
    service.from("organization_members").select("id").eq("organization_id", orgId).eq("profile_id", profileId).eq("member_role", "org_admin").maybeSingle(),
  ]);
  return !!owner || !!member;
}

/**
 * Hospital/Organization Admins delegate rights. An Attendance Admin can manage
 * attendance only — it does not grant full administrator access.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;
  if (!(await isOrgAdmin(auth.profile.id, auth.profile.role, d.organization_id))) return badRequest("Forbidden", 403);

  const service = await createServiceClient();
  const { data: target } = await service.from("profiles").select("id, full_name").eq("email", d.email.toLowerCase()).maybeSingle();
  if (!target) return badRequest("No MedLINK account uses that email. Ask them to register first.", 404);

  const { error } = await service.from("organization_members").upsert(
    { organization_id: d.organization_id, profile_id: target.id, member_role: d.member_role, granted_by: auth.profile.id },
    { onConflict: "organization_id,profile_id,member_role" }
  );
  if (error) return badRequest(error.message, 500);
  await service.from("audit_logs").insert({
    user_id: auth.profile.id, action: "delegate_role", resource_type: "organization", resource_id: d.organization_id,
    new_values: { profile_id: target.id, member_role: d.member_role },
  });
  await notify([target.id], {
    type: "attendance", title: d.member_role === "attendance_admin" ? "You are now an Attendance Admin" : "You are now a facility admin",
    message: "You can manage this facility from Facility Attendance.", link_url: "/attendance/facility",
  });
  return NextResponse.json({ ok: true, name: target.full_name }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const service = await createServiceClient();
  const { data: m } = await service.from("organization_members").select("*").eq("id", parsed.data.id).single();
  if (!m) return badRequest("Not found", 404);
  if (!(await isOrgAdmin(auth.profile.id, auth.profile.role, m.organization_id))) return badRequest("Forbidden", 403);
  await service.from("organization_members").delete().eq("id", m.id);
  await service.from("audit_logs").insert({
    user_id: auth.profile.id, action: "revoke_role", resource_type: "organization", resource_id: m.organization_id,
    old_values: { profile_id: m.profile_id, member_role: m.member_role },
  });
  return NextResponse.json({ ok: true });
}
