import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Landmark, Siren } from "lucide-react";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/medlink/badges";
import { ChatButton } from "@/components/medlink/chat-button";
import { FileLink } from "@/components/medlink/file-upload";
import { PaymentProofForm, BookerActions, OperatorActions } from "@/components/medlink/booking-actions";
import { BOOKING_KIND_LABELS, STATUS_LABELS, bookerCanModify, canRate, type BookingKind, type BookingStatus } from "@/lib/medlink/bookings";
import { paymentInstructions } from "@/lib/medlink/payment-instructions";
import { isCalendarConfigured } from "@/lib/medlink/google-calendar";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const CHAT_LABEL: Record<string, string> = {
  hospital: "Chat with Hospital", diagnostic: "Chat with Diagnostic Provider", pharmacy: "Chat with Pharmacist", ambulance: "Chat (non-urgent)",
};

type Item = { type: "product" | "request"; name: string; strength?: string | null; quantity: number; unit_price?: number; service?: string; duration?: string };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: b } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();

  const [{ data: profile }, { data: provider }, { data: service }, { data: doctor }, { data: events }, { data: payments }, { data: review }, { data: calLink }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    b.provider_id ? supabase.from("service_providers").select("id, name, kind, address, city, phone, emergency_phone, bank_name, bank_account_name, bank_account_number").eq("id", b.provider_id).maybeSingle() : Promise.resolve({ data: null }),
    b.service_id ? supabase.from("provider_services").select("name").eq("id", b.service_id).maybeSingle() : Promise.resolve({ data: null }),
    b.doctor_id ? supabase.from("provider_doctors").select("full_name, specialty").eq("id", b.doctor_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("booking_events").select("id, from_status, to_status, note, created_at").eq("booking_id", id).order("created_at"),
    supabase.from("transfer_payments").select("id, status, amount, transaction_reference, method, proof_url, rejection_reason, created_at").eq("booking_id", id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("id").eq("booking_id", id).eq("reviewer_id", user.id).maybeSingle(),
    supabase.from("calendar_event_links").select("google_event_id").eq("booking_id", id).maybeSingle(),
  ]);

  const isBooker = b.booker_id === user.id;
  const isAdmin = profile?.role === "admin";
  let isProvider = false;
  if (b.provider_id && !isBooker) {
    const service = await createServiceClient();
    const { data: m } = await service.from("provider_members").select("profile_id").eq("provider_id", b.provider_id).eq("profile_id", user.id).maybeSingle();
    isProvider = !!m;
  }
  const isOperator = b.kind === "professional_care" ? isAdmin : isProvider || isAdmin;

  const status = b.status as BookingStatus;
  const kind = b.kind as BookingKind;
  const items = (b.items ?? []) as Item[];
  const patient = (b.patient_details ?? {}) as Record<string, string | number>;
  const instructions = paymentInstructions({ kind: b.kind, reference: b.reference }, provider);
  const awaitingTransfer = ["awaiting_transfer", "rejected"].includes(b.payment_status) && b.amount != null;
  const lastRejected = (payments ?? []).find((p) => p.status === "rejected");

  return (
    <div className="animate-fade-in">
      <Header title={b.reference} subtitle={BOOKING_KIND_LABELS[kind]} />
      <div className="p-4 md:p-6 space-y-5 max-w-4xl">
        <Link href={isBooker ? "/bookings" : "/provider"} className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />Back</Link>

        {b.is_emergency && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-red-600 bg-red-50 p-3 text-sm text-red-900">
            <span className="flex items-center gap-2 font-semibold"><Siren className="h-4 w-4" />Emergency request</span>
            {(provider?.emergency_phone || provider?.phone) && <a className="font-semibold underline" href={`tel:${provider.emergency_phone ?? provider.phone}`}>Call {provider.name}</a>}
          </div>
        )}

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#0F172A]">{[service?.name, provider?.name].filter(Boolean).join(" — ") || BOOKING_KIND_LABELS[kind]}</p>
                {doctor && <p className="text-sm text-[#64748B]">{doctor.full_name}{doctor.specialty ? ` · ${doctor.specialty}` : ""}</p>}
              </div>
              <div className="flex flex-wrap gap-2"><PaymentStatusBadge status={b.payment_status} /><BookingStatusBadge status={b.status} /></div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {b.scheduled_at && <><dt className="text-[#64748B]">Date & time</dt><dd>{formatDateTime(b.scheduled_at)}</dd></>}
              {b.collection_method && <><dt className="text-[#64748B]">Collection</dt><dd>{b.collection_method === "home" ? "Home collection" : "In-centre"}</dd></>}
              {b.pickup_address && <><dt className="text-[#64748B]">{kind === "ambulance" ? "Pickup" : kind === "pharmacy" ? "Delivery" : "Location"}</dt><dd>{b.pickup_address}</dd></>}
              {b.destination_address && <><dt className="text-[#64748B]">Destination</dt><dd>{b.destination_address}</dd></>}
              {patient.full_name && <><dt className="text-[#64748B]">Patient</dt><dd>{patient.full_name}{patient.age ? `, ${patient.age}` : ""}</dd></>}
              {patient.phone && <><dt className="text-[#64748B]">Contact</dt><dd>{patient.phone}</dd></>}
              {patient.condition && <><dt className="text-[#64748B]">Details</dt><dd>{patient.condition}</dd></>}
              {b.recurrence_rule && <><dt className="text-[#64748B]">Recurring</dt><dd>{b.recurrence_rule.replace("FREQ=", "").toLowerCase()}</dd></>}
              {b.amount != null && <><dt className="text-[#64748B]">Amount</dt><dd className="font-semibold">{formatCurrency(Number(b.amount))}</dd></>}
              {b.cancellation_reason && <><dt className="text-[#64748B]">Cancellation reason</dt><dd>{b.cancellation_reason}</dd></>}
            </dl>
            {items.length > 0 && (
              <ul className="rounded-lg border border-[#F1F5F9] divide-y divide-[#F1F5F9] text-sm">
                {items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2 px-3 py-2">
                    <span>{it.service ? `${it.service.replace(/_/g, " ")} · ${it.duration}` : `${it.quantity} × ${it.name}${it.strength ? ` ${it.strength}` : ""}`}</span>
                    <span className="text-[#64748B]">{it.type === "request" ? "Awaiting quote" : it.unit_price != null ? formatCurrency(it.unit_price * it.quantity) : ""}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-4">
              <FileLink path={b.prescription_url} label="View prescription" />
              <FileLink path={b.result_url} label="View results" />
            </div>
            {isBooker && provider && <ChatButton providerId={provider.id} bookingId={b.id} label={CHAT_LABEL[kind] ?? "Chat"} />}
          </CardContent>
        </Card>

        {isBooker && awaitingTransfer && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Landmark className="h-4 w-4" />Pay by transfer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {lastRejected && b.payment_status === "rejected" && (
                <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">Your last proof was not verified: {lastRejected.rejection_reason}</p>
              )}
              {instructions.account_number ? (
                <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm rounded-lg bg-[#F8FAFC] p-3">
                  <dt className="text-[#64748B]">Pay to</dt><dd>{instructions.payee}</dd>
                  <dt className="text-[#64748B]">Bank</dt><dd>{instructions.bank_name}</dd>
                  <dt className="text-[#64748B]">Account name</dt><dd>{instructions.account_name}</dd>
                  <dt className="text-[#64748B]">Account number</dt><dd className="font-mono font-semibold">{instructions.account_number}</dd>
                  <dt className="text-[#64748B]">Amount</dt><dd className="font-semibold">{formatCurrency(Number(b.amount))}</dd>
                  <dt className="text-[#64748B]">Narration</dt><dd className="font-mono">{instructions.narration}</dd>
                </dl>
              ) : (
                <p className="text-sm text-[#64748B]">Payment account details will be shared by {instructions.payee} in chat. Use {instructions.narration} as the narration.</p>
              )}
              <PaymentProofForm bookingId={b.id} amount={Number(b.amount)} />
            </CardContent>
          </Card>
        )}

        {isBooker && b.payment_status === "awaiting_quote" && (
          <p className="rounded-lg bg-[#EBF4FF] p-3 text-sm text-[#0F4C81]">
            {kind === "professional_care" ? "RGH is reviewing your request. You'll be notified with a quote and payment instructions." : "The pharmacy is confirming availability and will send you a quote."}
          </p>
        )}

        {isBooker && (
          <BookerActions
            bookingId={b.id}
            canModify={bookerCanModify(status)}
            canAddToCalendar={isCalendarConfigured() && !!b.scheduled_at && ["confirmed", "in_progress", "dispatched", "sample_collected", "processing"].includes(status)}
            calendarLinked={!!calLink}
            canReview={canRate(status)}
            reviewed={!!review}
          />
        )}

        {isOperator && (
          <OperatorActions bookingId={b.id} kind={kind} status={status} paymentStatus={b.payment_status}
            payments={(payments ?? []).map((p) => ({ ...p, amount: Number(p.amount) }))} />
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">History</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="text-xs text-[#94A3B8] w-36 flex-shrink-0">{formatDateTime(e.created_at)}</span>
                  <span>{e.to_status ? STATUS_LABELS[e.to_status as BookingStatus] ?? e.to_status : ""}{e.note ? `${e.to_status ? " — " : ""}${e.note}` : ""}</span>
                </li>
              ))}
              {(payments ?? []).map((p) => (
                <li key={p.id} className="flex gap-3">
                  <span className="text-xs text-[#94A3B8] w-36 flex-shrink-0">{formatDateTime(p.created_at)}</span>
                  <span>Payment proof {p.status.replace("_", " ")} ({p.transaction_reference}) <FileLink path={p.proof_url} label="receipt" /></span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
