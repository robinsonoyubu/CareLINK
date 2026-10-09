import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, providerMemberIds } from "@/lib/medlink/server";

const CHAT_KIND: Record<string, "hospital" | "diagnostic" | "pharmacist" | "ambulance"> = {
  hospital: "hospital", diagnostic: "diagnostic", pharmacy: "pharmacist", ambulance: "ambulance",
};

const schema = z.object({
  provider_id: z.string().uuid(),
  booking_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
});

/**
 * Opens (or reuses) a chat with a provider, linked to the provider/product/
 * booking it was launched from. All human chats live in My Chats.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { provider_id, booking_id, service_id } = parsed.data;

  const service = await createServiceClient();
  const { data: provider } = await service.from("service_providers").select("id, kind, name, is_active").eq("id", provider_id).single();
  if (!provider?.is_active) return badRequest("Provider not found", 404);

  let label = provider.name;
  if (booking_id) {
    const { data: b } = await service.from("bookings").select("id, reference, booker_id, provider_id").eq("id", booking_id).single();
    if (!b || b.booker_id !== auth.profile.id || b.provider_id !== provider_id) return badRequest("Booking not found", 404);
    label = `${provider.name} · ${b.reference}`;
  } else if (service_id) {
    const { data: s } = await service.from("provider_services").select("name, provider_id").eq("id", service_id).single();
    if (!s || s.provider_id !== provider_id) return badRequest("Item not found", 404);
    label = `${provider.name} · ${s.name}`;
  }

  // Reuse an existing thread for the same context.
  let q = service.from("conversations").select("id").eq("type", "provider").eq("provider_id", provider_id)
    .contains("participant_ids", [auth.profile.id]);
  q = booking_id ? q.eq("booking_id", booking_id) : q.is("booking_id", null);
  q = service_id ? q.eq("service_id", service_id) : q.is("service_id", null);
  const { data: existing } = await q.limit(1).maybeSingle();
  if (existing) return NextResponse.json({ id: existing.id });

  const members = await providerMemberIds(provider_id);
  if (members.length === 0) return badRequest("This provider has no chat staff yet", 409);

  const { data, error } = await service.from("conversations").insert({
    type: "provider",
    chat_kind: CHAT_KIND[provider.kind],
    provider_id,
    booking_id: booking_id ?? null,
    service_id: service_id ?? null,
    name: label,
    context_label: label,
    participant_ids: [auth.profile.id, ...members],
  }).select("id").single();
  if (error) return badRequest(error.message, 500);
  return NextResponse.json({ id: data.id }, { status: 201 });
}
