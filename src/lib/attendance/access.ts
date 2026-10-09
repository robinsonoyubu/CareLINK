import { createServiceClient } from "@/lib/supabase/server";

/** Org owner, delegated org admin, delegated attendance admin, or RGH. */
export async function canManageAttendance(profileId: string, role: string, organizationId: string) {
  if (role === "admin") return true;
  const service = await createServiceClient();
  const [{ data: org }, { data: member }] = await Promise.all([
    service.from("organizations").select("id").eq("id", organizationId).eq("profile_id", profileId).maybeSingle(),
    service.from("organization_members").select("member_role").eq("organization_id", organizationId).eq("profile_id", profileId)
      .in("member_role", ["org_admin", "attendance_admin"]).limit(1).maybeSingle(),
  ]);
  return !!org || !!member;
}
