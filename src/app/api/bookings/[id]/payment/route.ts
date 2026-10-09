import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify, providerMemberIds, rghAdminIds } from "@/lib/medlink/server";

const proofSchema = z.object({
  method: z.enum(["bank_transfer", "transfer_payment"]),
  amount: z.number().positive(),
  transaction_reference: z.string().min(3).max(120),
  proof_url: z.string().max(500).optional(),
});

/** Booker submits proof of a Bank Transfer / Transfer Payment. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const parsed = proofSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  const { data: b } = await service.from("bookings").select("id, reference, kind, booker_id, provider_id, amount, payment_status, status").eq("id", id).single();
  if (!b || b.booker_id !== auth.profile.id) return badRequest("Booking not found", 404);
  if (!["awaiting_transfer", "rejected"].includes(b.payment_status)) return badRequest("This booking is not awaiting payment", 409);
  if (b.amount != null && Math.abs(Number(b.amount) - parsed.data.amount) > 0.009) {
    return badRequest(`The amount must match the amount due (${b.amount})`);
  }

  const { error } = await service.from("transfer_payments").insert({
    booking_id: b.id,
    payer_id: auth.profile.id,
    method: parsed.data.method,
    amount: parsed.data.amount,
    transaction_reference: parsed.data.transaction_reference,
    proof_url: parsed.data.proof_url ?? null,
  });
  if (error) return badRequest(error.message, 500);

  await service.from("bookings").update({ payment_status: "proof_submitted", status: "payment_verification" }).eq("id", b.id);

  const verifiers = b.kind === "professional_care" ? await rghAdminIds() : await providerMemberIds(b.provider_id);
  await notify(verifiers, {
    type: "payment", title: "Payment proof to verify",
    message: `${b.reference}: transfer reference ${parsed.data.transaction_reference}`,
    link_url: b.kind === "professional_care" ? `/admin/payments` : `/bookings/${b.id}`,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
