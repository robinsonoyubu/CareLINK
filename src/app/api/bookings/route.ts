import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify, providerMemberIds, rghAdminIds } from "@/lib/medlink/server";
import { makeReference, type BookingStatus, type PaymentStatus } from "@/lib/medlink/bookings";
import { priceOrder, type CatalogueItem } from "@/lib/medlink/pricing";

const patientSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  age: z.coerce.number().int().min(0).max(130).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  condition: z.string().max(500).optional(),
  relationship: z.string().max(60).optional(),
});

const base = {
  provider_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
};

const createSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hospital"),
    ...base,
    service_id: z.string().uuid(),
    doctor_id: z.string().uuid().optional(),
    scheduled_at: z.string().datetime(),
    patient: patientSchema,
  }),
  z.object({
    kind: z.literal("diagnostic"),
    ...base,
    service_id: z.string().uuid(),
    collection_method: z.enum(["in_centre", "home"]),
    pickup_address: z.string().max(300).optional(),
    scheduled_at: z.string().datetime(),
    patient: patientSchema,
  }),
  z.object({
    kind: z.literal("pharmacy"),
    ...base,
    cart: z.array(z.object({ service_id: z.string().uuid(), quantity: z.number().int() })).max(50).default([]),
    drug_requests: z.array(z.object({
      name: z.string().max(120),
      strength: z.string().max(60).optional(),
      quantity: z.number().int(),
      notes: z.string().max(300).optional(),
    })).max(20).default([]),
    prescription_url: z.string().max(500).optional(),
    delivery_address: z.string().max(300).optional(),
    patient: patientSchema,
  }),
  z.object({
    kind: z.literal("ambulance"),
    ...base,
    is_emergency: z.boolean(),
    service_id: z.string().uuid().optional(),
    pickup_address: z.string().min(3).max(300),
    pickup_lat: z.number().min(-90).max(90).optional(),
    pickup_lng: z.number().min(-180).max(180).optional(),
    destination_address: z.string().max(300).optional(),
    scheduled_at: z.string().datetime().optional(),
    // Emergencies only need essentials: a contact number and what is happening.
    patient: patientSchema.partial().extend({ phone: z.string().min(7).max(20) }),
  }),
]);

const professionalCareSchema = z.object({
  kind: z.literal("professional_care"),
  service: z.enum(["nursing", "caregiver", "physiotherapy", "doctor_visit", "other"]),
  duration: z.enum(["hourly", "daily", "weekly", "monthly", "live_in"]),
  location: z.string().min(3).max(300),
  scheduled_at: z.string().datetime(),
  recurrence_rule: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  patient: patientSchema,
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { profile } = auth;

  const body = await request.json().catch(() => null);
  const service = await createServiceClient();
  const reference = makeReference("MLB");

  // Public professional-service flow: Request → RGH Review → Quote → Transfer → Proof → Verification → Matching.
  if (body?.kind === "professional_care") {
    const parsed = professionalCareSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());
    const d = parsed.data;
    const { data, error } = await service.from("bookings").insert({
      reference,
      kind: "professional_care",
      booker_id: profile.id,
      status: "rgh_review",
      payment_status: "awaiting_quote",
      scheduled_at: d.scheduled_at,
      recurrence_rule: d.recurrence_rule ?? null,
      pickup_address: d.location,
      patient_details: d.patient,
      notes: d.notes ?? null,
      items: [{ service: d.service, duration: d.duration }],
    }).select("id, reference").single();
    if (error) return badRequest(error.message, 500);
    await notify(await rghAdminIds(), {
      type: "booking", title: "New professional-care request",
      message: `${reference}: ${d.service.replace(/_/g, " ")} (${d.duration}) — awaiting RGH review`,
      link_url: `/bookings/${data.id}`,
    });
    await notify([profile.id], {
      type: "booking", title: "Request received",
      message: `${reference} is with RGH for review. You'll get a quote and payment instructions next.`,
      link_url: `/bookings/${data.id}`,
    });
    return NextResponse.json(data, { status: 201 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const { data: provider } = await service
    .from("service_providers")
    .select("id, kind, name, is_active, emergency_phone, phone")
    .eq("id", d.provider_id)
    .single();
  if (!provider || !provider.is_active || provider.kind !== d.kind) return badRequest("Provider not available for this service", 404);

  let svc: { id: string; name: string; price: number | null; requires_payment: boolean; home_collection: boolean; is_available: boolean } | null = null;
  if ("service_id" in d && d.service_id) {
    const { data: s } = await service
      .from("provider_services")
      .select("id, name, price, requires_payment, home_collection, is_available, provider_id, is_active")
      .eq("id", d.service_id)
      .single();
    if (!s || s.provider_id !== provider.id || !s.is_active) return badRequest("Service not found for this provider", 404);
    svc = s;
  }

  let status: BookingStatus = "pending";
  let paymentStatus: PaymentStatus = "not_required";
  let amount: number | null = null;
  const row: Record<string, unknown> = {
    reference,
    kind: d.kind,
    booker_id: profile.id,
    provider_id: provider.id,
    service_id: svc?.id ?? null,
    patient_details: d.patient,
    notes: d.notes ?? null,
  };

  if (d.kind === "hospital") {
    if (d.doctor_id) {
      const { data: doc } = await service.from("provider_doctors").select("id, provider_id").eq("id", d.doctor_id).single();
      if (!doc || doc.provider_id !== provider.id) return badRequest("Doctor not found for this hospital", 404);
      row.doctor_id = doc.id;
    }
    row.scheduled_at = d.scheduled_at;
    if (svc?.requires_payment && svc.price) {
      amount = svc.price; status = "payment_pending"; paymentStatus = "awaiting_transfer";
    }
  }

  if (d.kind === "diagnostic") {
    if (d.collection_method === "home" && !svc?.home_collection) return badRequest("Home collection is not offered for this test");
    if (d.collection_method === "home" && !d.pickup_address) return badRequest("A collection address is required for home collection");
    if (svc?.price == null) return badRequest("This test has no listed price yet");
    row.scheduled_at = d.scheduled_at;
    row.collection_method = d.collection_method;
    row.pickup_address = d.pickup_address ?? null;
    amount = svc.price; status = "payment_pending"; paymentStatus = "awaiting_transfer";
  }

  if (d.kind === "pharmacy") {
    const ids = d.cart.map((c) => c.service_id);
    const { data: catalogue } = ids.length
      ? await service.from("provider_services")
          .select("id, name, price, requires_prescription, in_stock, strength")
          .eq("provider_id", provider.id).eq("category", "product").in("id", ids)
      : { data: [] };
    const priced = priceOrder(d.cart, d.drug_requests, (catalogue ?? []) as CatalogueItem[]);
    if (priced.errors.length) return badRequest(priced.errors.join("; "));
    if (priced.lines.length === 0 && priced.requests.length === 0) return badRequest("Your order is empty");
    if (priced.needsPrescription && !d.prescription_url) {
      return badRequest("A doctor's prescription is required for one or more items in this order");
    }
    row.items = [
      ...priced.lines.map((l) => ({ type: "product", ...l })),
      ...priced.requests.map((r) => ({ type: "request", ...r })),
    ];
    row.prescription_url = d.prescription_url ?? null;
    row.pickup_address = d.delivery_address ?? null;
    if (priced.needsQuote) {
      // Pharmacy confirms availability and quotes the unlisted items before payment.
      status = "pending"; paymentStatus = "awaiting_quote"; amount = priced.subtotal || null;
    } else {
      status = "payment_pending"; paymentStatus = "awaiting_transfer"; amount = priced.subtotal;
    }
  }

  if (d.kind === "ambulance") {
    row.is_emergency = d.is_emergency;
    row.pickup_address = d.pickup_address;
    row.pickup_lat = d.pickup_lat ?? null;
    row.pickup_lng = d.pickup_lng ?? null;
    row.destination_address = d.destination_address ?? null;
    row.scheduled_at = d.scheduled_at ?? new Date().toISOString();
    if (d.is_emergency) {
      // Never gate an emergency on payment, chat or long forms.
      status = "pending"; paymentStatus = "not_required";
    } else {
      if (!d.destination_address) return badRequest("Destination is required");
      if (svc?.price) { amount = svc.price; status = "payment_pending"; paymentStatus = "awaiting_transfer"; }
    }
  }

  row.status = status;
  row.payment_status = paymentStatus;
  row.amount = amount;

  const { data, error } = await service.from("bookings").insert(row).select("id, reference, status, payment_status, amount").single();
  if (error) return badRequest(error.message, 500);

  const members = await providerMemberIds(provider.id);
  const link = `/bookings/${data.id}`;
  if (d.kind === "ambulance" && d.is_emergency) {
    await notify([...members, ...(await rghAdminIds())], {
      type: "dispatch", title: "EMERGENCY request",
      message: `${reference}: pickup at ${d.pickup_address}. Contact ${d.patient.phone} immediately.`,
      link_url: `/bookings/${data.id}`,
    });
    return NextResponse.json({ ...data, emergency_phone: provider.emergency_phone ?? provider.phone }, { status: 201 });
  }

  await notify(members, {
    type: d.kind === "pharmacy" ? "order" : "booking",
    title: `New ${d.kind} booking`,
    message: `${reference} from ${profile.full_name}`,
    link_url: `/bookings/${data.id}`,
  });
  await notify([profile.id], {
    type: "booking", title: "Booking created",
    message: paymentStatus === "awaiting_transfer"
      ? `${reference}: complete your transfer and upload proof to confirm.`
      : `${reference} has been sent to ${provider.name}.`,
    link_url: link,
  });
  return NextResponse.json(data, { status: 201 });
}
