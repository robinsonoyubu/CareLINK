import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify, providerMemberIds, isProviderMember } from "@/lib/medlink/server";
import { BOOKING_STATUSES, STATUS_LABELS, bookerCanModify, canTransition, type BookingStatus } from "@/lib/medlink/bookings";
import { syncBookingToCalendar } from "@/lib/medlink/google-calendar";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("reschedule"), scheduled_at: z.string().datetime(), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("status"), status: z.enum(BOOKING_STATUSES), note: z.string().max(500).optional() }),
  // Provider (or RGH for professional care) sets the price, which opens the transfer step.
  z.object({ action: z.literal("quote"), amount: z.number().positive().max(100_000_000), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("result"), result_url: z.string().min(3).max(500) }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { profile } = auth;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const a = parsed.data;

  const service = await createServiceClient();
  const { data: b } = await service.from("bookings").select("*").eq("id", id).single();
  if (!b) return badRequest("Booking not found", 404);

  const isBooker = b.booker_id === profile.id;
  const isAdmin = profile.role === "admin";
  const isProvider = await isProviderMember(profile.id, b.provider_id);
  // RGH owns professional-care operations; providers own their own services.
  const isOperator = b.kind === "professional_care" ? isAdmin : isProvider || isAdmin;
  if (!isBooker && !isOperator) return badRequest("Forbidden", 403);

  const status = b.status as BookingStatus;
  const update: Record<string, unknown> = {};
  let message = "";

  switch (a.action) {
    case "cancel":
      if (!(isOperator || (isBooker && bookerCanModify(status)))) return badRequest("This booking can no longer be cancelled here. Open a dispute if you need help.", 409);
      if (!canTransition(status, "cancelled")) return badRequest(`Cannot cancel a ${STATUS_LABELS[status]} booking`, 409);
      update.status = "cancelled";
      update.cancellation_reason = a.reason;
      message = `${b.reference} was cancelled: ${a.reason}`;
      break;
    case "reschedule":
      if (!(isOperator || (isBooker && bookerCanModify(status)))) return badRequest("This booking can no longer be rescheduled", 409);
      if (new Date(a.scheduled_at).getTime() < Date.now()) return badRequest("Choose a future date and time");
      update.scheduled_at = a.scheduled_at;
      message = `${b.reference} was rescheduled to ${new Date(a.scheduled_at).toLocaleString("en-NG")}`;
      break;
    case "status":
      if (!isOperator) return badRequest("Only the provider or RGH can change the status", 403);
      if (!canTransition(status, a.status)) return badRequest(`Cannot move from ${STATUS_LABELS[status]} to ${STATUS_LABELS[a.status]}`, 409);
      if (a.status === "confirmed" && ["awaiting_transfer", "proof_submitted", "awaiting_quote"].includes(b.payment_status)) {
        return badRequest("Payment must be verified before confirming", 409);
      }
      update.status = a.status;
      message = `${b.reference} is now ${STATUS_LABELS[a.status]}${a.note ? ` — ${a.note}` : ""}`;
      break;
    case "quote":
      if (!isOperator) return badRequest("Forbidden", 403);
      if (b.payment_status !== "awaiting_quote") return badRequest("This booking is not awaiting a quote", 409);
      update.amount = a.amount;
      update.payment_status = "awaiting_transfer";
      update.status = "payment_pending";
      message = `${b.reference}: your quote is ready. Transfer the amount and upload your proof of payment.`;
      break;
    case "result":
      if (!isOperator || b.kind !== "diagnostic") return badRequest("Forbidden", 403);
      update.result_url = a.result_url;
      update.status = "results_ready";
      message = `${b.reference}: your diagnostic results are ready.`;
      break;
  }

  const { data: updated, error } = await service.from("bookings").update(update).eq("id", id).select("*").single();
  if (error) return badRequest(error.message, 500);

  const note = a.action === "reschedule" ? message : "note" in a ? a.note : undefined;
  if (note) {
    await service.from("booking_events").insert({ booking_id: id, actor_id: profile.id, note });
  }

  const notifyType = a.action === "result" ? "result" : a.action === "quote" ? "payment" : b.kind === "ambulance" && a.action === "status" && a.status === "dispatched" ? "dispatch" : "booking";
  if (isBooker) {
    await notify(b.kind === "professional_care" ? [] : await providerMemberIds(b.provider_id), {
      type: "booking", title: `Booking ${a.action === "cancel" ? "cancelled" : "updated"}`, message, link_url: `/bookings/${id}`,
    });
  } else {
    await notify([b.booker_id], { type: notifyType, title: "Booking update", message, link_url: `/bookings/${id}` });
  }

  await syncBookingToCalendar(id);
  return NextResponse.json(updated);
}
