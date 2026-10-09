import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest } from "@/lib/medlink/server";
import { issueQrToken } from "@/lib/attendance/qr";
import { canManageAttendance } from "@/lib/attendance/access";

/** Facility display requests a fresh short-lived signed QR for one site. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = z.object({ site_id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  const { data: site } = await service.from("facility_sites").select("id, organization_id, qr_ttl_seconds, is_active").eq("id", parsed.data.site_id).single();
  if (!site?.is_active) return badRequest("Site not found", 404);
  if (!(await canManageAttendance(auth.profile.id, auth.profile.role, site.organization_id))) return badRequest("Forbidden", 403);

  const { token, payload } = issueQrToken({ organizationId: site.organization_id, siteId: site.id, ttl: site.qr_ttl_seconds });
  return NextResponse.json(
    { token, expires_at: (payload.issuedAt + payload.ttl) * 1000, refresh_in_ms: Math.max(5, payload.ttl - 10) * 1000 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
