import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";

/** Application Submitted → Under Review → RGH Verification → Verified or Rejected. */
const FLOW: Record<string, string[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["rgh_verification", "rejected"],
  rgh_verification: ["verified", "rejected"],
  rejected: ["under_review"],
  verified: ["under_review"],
};

const schema = z.object({
  status: z.enum(["under_review", "rgh_verification", "verified", "rejected"]),
  note: z.string().max(1000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.profile.role !== "admin") return badRequest("Only authorised RGH personnel can verify professionals", 403);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { status, note } = parsed.data;
  if (status === "rejected" && !note) return badRequest("Give a reason for rejection");

  const service = await createServiceClient();
  const { data: pro } = await service.from("professionals").select("id, profile_id, profession, application_status").eq("id", id).single();
  if (!pro) return badRequest("Not found", 404);
  if (!FLOW[pro.application_status]?.includes(status)) {
    return badRequest(`Cannot move from ${pro.application_status} to ${status}`, 409);
  }

  if (status === "verified") {
    const [{ data: cred }, { count: guarantors }] = await Promise.all([
      service.from("professional_credentials").select("*").eq("professional_id", id).maybeSingle(),
      service.from("guarantors").select("id", { count: "exact", head: true }).eq("professional_id", id),
    ]);
    const missing: string[] = [];
    if (!cred?.nin) missing.push("NIN");
    if (!cred?.government_id_url) missing.push("Government ID");
    if (!cred?.passport_photo_url) missing.push("Passport photograph");
    if (pro.profession === "nurse") {
      if (!cred?.license_kind || !cred?.license_number) missing.push("Professional licence or notification number");
      if (cred?.license_kind === "professional_license" && !cred?.license_expiry_date) missing.push("Practising licence expiry date");
      if (cred?.license_expiry_date && new Date(cred.license_expiry_date) < new Date()) missing.push("an unexpired practising licence");
    }
    if (["caregiver", "nurse_assistant"].includes(pro.profession) && !cred?.certificate_url) {
      missing.push("Training or competency certificate");
    }
    if (!guarantors) missing.push("Guarantor");
    if (missing.length) return badRequest(`Cannot verify yet — missing: ${missing.join(", ")}`, 409);
  }

  await service.from("professionals").update({
    application_status: status,
    is_verified: status === "verified",
    workforce_status: status === "verified" ? "available" : status === "rejected" ? "under_review" : "under_review",
    rejection_reason: status === "rejected" ? note : null,
    reviewed_by: auth.profile.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id);
  await service.from("professional_application_events").insert({
    professional_id: id, actor_id: auth.profile.id, from_status: pro.application_status, to_status: status, note: note ?? null,
  });

  const labels: Record<string, string> = {
    under_review: "Your application is under review.",
    rgh_verification: "Your documents are with RGH for verification.",
    verified: "You are now RGH Verified.",
    rejected: `Your application was not approved: ${note}`,
  };
  await notify([pro.profile_id], { type: "verification", title: "Application update", message: labels[status], link_url: "/profile" });
  return NextResponse.json({ ok: true });
}
