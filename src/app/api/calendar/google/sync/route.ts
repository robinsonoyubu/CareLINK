import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest } from "@/lib/medlink/server";
import { syncBookingToCalendar } from "@/lib/medlink/google-calendar";

/** "Add to Google Calendar" on a confirmed booking. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = z.object({ booking_id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  const { data: b } = await service.from("bookings").select("booker_id").eq("id", parsed.data.booking_id).single();
  if (!b || b.booker_id !== auth.profile.id) return badRequest("Booking not found", 404);

  const result = await syncBookingToCalendar(parsed.data.booking_id, { explicit: true });
  if (!result.synced) return badRequest(result.reason, 409);
  return NextResponse.json(result);
}
