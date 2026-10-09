import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify, rghAdminIds, providerMemberIds } from "@/lib/medlink/server";
import { makeReference } from "@/lib/medlink/bookings";

const schema = z.object({
  category: z.enum(["payment", "provider_issue", "no_show", "pharmacy_order", "diagnostic", "appointment", "ambulance", "other"]),
  booking_id: z.string().uuid().optional(),
  subject: z.string().min(4).max(150),
  description: z.string().min(10).max(4000),
  evidence_urls: z.array(z.string().max(500)).max(10).default([]),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const service = await createServiceClient();
  let providerId: string | null = null;
  if (d.booking_id) {
    const { data: b } = await service.from("bookings").select("id, booker_id, provider_id").eq("id", d.booking_id).single();
    if (!b || b.booker_id !== auth.profile.id) return badRequest("Linked booking not found", 404);
    providerId = b.provider_id;
  }

  const reference = makeReference("DSP");
  const { data, error } = await service.from("disputes").insert({
    reference, opened_by: auth.profile.id, booking_id: d.booking_id ?? null,
    category: d.category, subject: d.subject, description: d.description,
  }).select("id, reference").single();
  if (error) return badRequest(error.message, 500);

  if (d.evidence_urls.length) {
    await service.from("dispute_events").insert(d.evidence_urls.map((url) => ({
      dispute_id: data.id, actor_id: auth.profile.id, kind: "evidence", evidence_url: url,
    })));
  }

  await notify(await rghAdminIds(), {
    type: "dispute", title: "New dispute", message: `${reference}: ${d.subject}`, link_url: `/disputes/${data.id}`,
  });
  await notify(await providerMemberIds(providerId), {
    type: "dispute", title: "A dispute was opened on a booking", message: `${reference}: RGH is reviewing.`, link_url: `/disputes/${data.id}`,
  });
  await notify([auth.profile.id], {
    type: "dispute", title: "Dispute opened", message: `Your reference is ${reference}. RGH will review it.`, link_url: `/disputes/${data.id}`,
  });
  return NextResponse.json(data, { status: 201 });
}
