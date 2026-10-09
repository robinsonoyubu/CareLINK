import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify, isProviderMember } from "@/lib/medlink/server";
import { syncBookingToCalendar } from "@/lib/medlink/google-calendar";

const schema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("verify") }),
  z.object({ decision: z.literal("reject"), reason: z.string().min(3).max(500) }),
]);

/** After verification a booking moves to its next step. */
const NEXT_STATUS: Record<string, string> = {
  professional_care: "matching",
  pharmacy: "processing",
  hospital: "confirmed",
  diagnostic: "confirmed",
  ambulance: "confirmed",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  const { data: p } = await service.from("transfer_payments").select("id, status, booking_id, amount").eq("id", id).single();
  if (!p) return badRequest("Payment not found", 404);
  const { data: b } = await service.from("bookings").select("id, reference, kind, booker_id, provider_id").eq("id", p.booking_id).single();
  if (!b) return badRequest("Booking not found", 404);

  const allowed = b.kind === "professional_care"
    ? auth.profile.role === "admin"
    : auth.profile.role === "admin" || (await isProviderMember(auth.profile.id, b.provider_id));
  if (!allowed) return badRequest("Forbidden", 403);
  if (p.status !== "proof_submitted") return badRequest("Already processed", 409);

  const now = new Date().toISOString();
  if (parsed.data.decision === "verify") {
    await service.from("transfer_payments").update({ status: "verified", verified_by: auth.profile.id, verified_at: now }).eq("id", p.id);
    await service.from("bookings").update({ payment_status: "verified", status: NEXT_STATUS[b.kind] }).eq("id", b.id);
    await notify([b.booker_id], {
      type: "payment", title: "Payment verified",
      message: b.kind === "professional_care"
        ? `${b.reference}: payment verified. RGH is now matching a verified professional.`
        : `${b.reference}: payment verified — your booking is confirmed.`,
      link_url: `/bookings/${b.id}`,
    });
    await syncBookingToCalendar(b.id);
  } else {
    await service.from("transfer_payments").update({
      status: "rejected", verified_by: auth.profile.id, verified_at: now, rejection_reason: parsed.data.reason,
    }).eq("id", p.id);
    await service.from("bookings").update({ payment_status: "rejected", status: "payment_pending" }).eq("id", b.id);
    await notify([b.booker_id], {
      type: "payment", title: "Payment could not be verified",
      message: `${b.reference}: ${parsed.data.reason}. Please check and resubmit your proof.`,
      link_url: `/bookings/${b.id}`,
    });
  }
  return NextResponse.json({ ok: true });
}
