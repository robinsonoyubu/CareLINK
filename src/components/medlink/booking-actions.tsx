"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarPlus, XCircle, CalendarClock, Scale, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { FileUpload } from "./file-upload";
import { BOOKING_STATUSES, STATUS_LABELS, canTransition, type BookingStatus } from "@/lib/medlink/bookings";
import { formatCurrency } from "@/lib/utils";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) {
    const e = data.error;
    toast.error(typeof e === "string" ? e : "Something went wrong");
    return false;
  }
  return true;
}

export function PaymentProofForm({ bookingId, amount }: { bookingId: string; amount: number }) {
  const router = useRouter();
  const [method, setMethod] = useState<"bank_transfer" | "transfer_payment">("bank_transfer");
  const [txRef, setTxRef] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await call(`/api/bookings/${bookingId}/payment`, "POST", { method, amount, transaction_reference: txRef.trim(), proof_url: proof ?? undefined });
    setBusy(false);
    if (ok) { toast.success("Proof submitted for verification"); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={method === "bank_transfer"} onChange={() => setMethod("bank_transfer")} />Bank Transfer</label>
        <label className="flex items-center gap-2"><input type="radio" checked={method === "transfer_payment"} onChange={() => setMethod("transfer_payment")} />Transfer Payment</label>
      </div>
      <div className="space-y-1 max-w-sm">
        <Label htmlFor="txref">Transaction reference / session ID</Label>
        <Input id="txref" value={txRef} onChange={(e) => setTxRef(e.target.value)} />
      </div>
      <FileUpload folder="payment-proofs" label="Upload receipt / screenshot" value={proof} onUploaded={setProof} />
      <Button loading={busy} disabled={txRef.trim().length < 3} onClick={submit}>I have paid {formatCurrency(amount)}</Button>
    </div>
  );
}

export function BookerActions({ bookingId, canModify, canAddToCalendar, calendarLinked, canReview, reviewed }: {
  bookingId: string; canModify: boolean; canAddToCalendar: boolean; calendarLinked: boolean; canReview: boolean; reviewed: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "cancel" | "reschedule">("none");
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(body: unknown) {
    setBusy(true);
    const ok = await call(`/api/bookings/${bookingId}`, "PATCH", body);
    setBusy(false);
    if (ok) { setMode("none"); router.refresh(); }
  }

  async function addToCalendar() {
    setBusy(true);
    const res = await fetch("/api/calendar/google/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: bookingId }) });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    if (res.ok) { toast.success("Added to Google Calendar"); router.refresh(); return; }
    if (data.error === "not_connected" || data.error === "not_configured") {
      toast.info("Connect Google Calendar in Profile → Calendar first");
      router.push("/profile?tab=calendar");
    } else toast.error("Could not add to calendar");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canModify && <Button size="sm" variant="outline" onClick={() => setMode(mode === "reschedule" ? "none" : "reschedule")}><CalendarClock className="h-4 w-4" />Reschedule</Button>}
        {canModify && <Button size="sm" variant="outline" onClick={() => setMode(mode === "cancel" ? "none" : "cancel")}><XCircle className="h-4 w-4" />Cancel</Button>}
        {canAddToCalendar && (
          <Button size="sm" variant="outline" loading={busy && mode === "none"} onClick={addToCalendar}>
            <CalendarPlus className="h-4 w-4" />{calendarLinked ? "Update Google Calendar" : "Add to Google Calendar"}
          </Button>
        )}
        <Link href={`/disputes/new?booking=${bookingId}`}><Button size="sm" variant="ghost"><Scale className="h-4 w-4" />Report a problem</Button></Link>
      </div>
      {mode === "cancel" && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1 flex-1"><Label htmlFor="cr">Reason for cancelling</Label><Input id="cr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Button variant="destructive" loading={busy} disabled={reason.trim().length < 3} onClick={() => run({ action: "cancel", reason })}>Confirm cancellation</Button>
        </div>
      )}
      {mode === "reschedule" && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1"><Label htmlFor="rw">New date & time</Label><Input id="rw" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
          <Button loading={busy} disabled={!when} onClick={() => run({ action: "reschedule", scheduled_at: new Date(when).toISOString() })}>Request new time</Button>
        </div>
      )}
      {canReview && !reviewed && <ReviewForm bookingId={bookingId} />}
      {reviewed && <p className="text-sm text-green-700">Thanks — your rating has been recorded.</p>}
    </div>
  );
}

const CRITERIA = ["professionalism", "punctuality", "communication", "respect", "reliability"] as const;

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)} className={n <= value ? "text-amber-500" : "text-[#CBD5E1]"}>
          <Star className="h-5 w-5" fill="currentColor" />
        </button>
      ))}
    </div>
  );
}


function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reviews").insert({ booking_id: bookingId, reviewer_id: user?.id, rating, criteria, comment: comment.trim() || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your rating");
    router.refresh();
  }

  return (
    <Card><CardContent className="p-4 space-y-3">
      <p className="text-sm font-semibold">Rate this service</p>
      <Stars value={rating} onChange={setRating} label="Overall rating" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CRITERIA.map((c) => (
          <div key={c} className="flex items-center justify-between gap-2 text-sm capitalize">{c}
            <Stars value={criteria[c] ?? 0} onChange={(n) => setCriteria({ ...criteria, [c]: n })} label={c} />
          </div>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={1000} placeholder="Share your experience (optional)"
        className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" aria-label="Review comment" />
      <Button size="sm" disabled={!rating} loading={busy} onClick={submit}>Submit rating</Button>
    </CardContent></Card>
  );
}

export function OperatorActions({ bookingId, kind, status, paymentStatus, payments }: {
  bookingId: string; kind: string; status: BookingStatus; paymentStatus: string;
  payments: { id: string; status: string; amount: number; transaction_reference: string | null; method: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<BookingStatus | "">("");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const options = BOOKING_STATUSES.filter((s) => canTransition(status, s) && !["payment_verification"].includes(s));

  async function run(url: string, method: string, body: unknown, msg: string) {
    setBusy(true);
    const ok = await call(url, method, body);
    setBusy(false);
    if (ok) { toast.success(msg); setNote(""); router.refresh(); }
  }

  return (
    <Card className="border-[#0F4C81]/30"><CardContent className="p-4 space-y-4">
      <p className="text-sm font-semibold text-[#0F4C81]">{kind === "professional_care" ? "RGH operations" : "Provider actions"}</p>

      {paymentStatus === "awaiting_quote" && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1"><Label htmlFor="q">Quote amount (₦)</Label><Input id="q" type="number" min={1} value={quote} onChange={(e) => setQuote(e.target.value)} /></div>
          <Button loading={busy} disabled={!(Number(quote) > 0)} onClick={() => run(`/api/bookings/${bookingId}`, "PATCH", { action: "quote", amount: Number(quote) }, "Quote sent")}>Send quote & payment instructions</Button>
        </div>
      )}

      {payments.filter((p) => p.status === "proof_submitted").map((p) => (
        <div key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 text-sm">
          <p>Proof submitted: {formatCurrency(p.amount)} via {p.method.replace("_", " ")} · ref <strong>{p.transaction_reference}</strong></p>
          <p className="text-xs text-amber-900">Confirm the money has arrived in the receiving account before verifying.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" loading={busy} onClick={() => run(`/api/payments/transfer/${p.id}/verify`, "POST", { decision: "verify" }, "Payment verified")}>Verify payment</Button>
            <Input placeholder="Reason if rejecting" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="sm:w-64 bg-white" />
            <Button size="sm" variant="outline" disabled={rejectReason.trim().length < 3} loading={busy}
              onClick={() => run(`/api/payments/transfer/${p.id}/verify`, "POST", { decision: "reject", reason: rejectReason }, "Payment rejected")}>Reject</Button>
          </div>
        </div>
      ))}

      {kind === "diagnostic" && ["confirmed", "sample_collected", "in_progress"].includes(status) && (
        <div className="space-y-2">
          <FileUpload folder="results" label="Upload results" value={result} onUploaded={setResult} />
          <Button size="sm" disabled={!result} loading={busy} onClick={() => run(`/api/bookings/${bookingId}`, "PATCH", { action: "result", result_url: result }, "Results released")}>Release results to patient</Button>
        </div>
      )}

      {options.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="ns">Update status</Label>
            <select id="ns" value={next} onChange={(e) => setNext(e.target.value as BookingStatus)} className="flex h-10 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
              <option value="">Choose…</option>
              {options.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="space-y-1 flex-1"><Label htmlFor="nn">Note to the client (optional)</Label><Input id="nn" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <Button loading={busy} disabled={!next} onClick={() => run(`/api/bookings/${bookingId}`, "PATCH", next === "cancelled"
            ? { action: "cancel", reason: note || "Cancelled by provider" }
            : { action: "status", status: next, note: note || undefined }, "Status updated")}>Save</Button>
        </div>
      )}
    </CardContent></Card>
  );
}
