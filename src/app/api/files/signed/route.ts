import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest } from "@/lib/medlink/server";

/**
 * Issues a 5-minute signed URL for a private file if the caller may see it:
 * their own upload, RGH, or a file attached to a booking / payment / dispute
 * that RLS already lets them read.
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const path = new URL(request.url).searchParams.get("path");
  if (!path || path.includes("..") || !/^[0-9a-f-]{36}\/[\w./-]+$/.test(path)) return badRequest("Invalid path");

  let allowed = path.startsWith(`${auth.profile.id}/`) || auth.profile.role === "admin";
  if (!allowed) {
    const s = auth.supabase;
    const checks = await Promise.all([
      s.from("bookings").select("id").or(`prescription_url.eq.${path},result_url.eq.${path}`).limit(1),
      s.from("transfer_payments").select("id").eq("proof_url", path).limit(1),
      s.from("dispute_events").select("id").eq("evidence_url", path).limit(1),
    ]);
    allowed = checks.some((c) => (c.data?.length ?? 0) > 0);
  }
  if (!allowed) return badRequest("Forbidden", 403);

  const service = await createServiceClient();
  const { data, error } = await service.storage.from("medlink-private").createSignedUrl(path, 300);
  if (error || !data) return badRequest("File not found", 404);
  return NextResponse.redirect(data.signedUrl);
}
