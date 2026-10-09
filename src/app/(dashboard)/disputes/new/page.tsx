"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/medlink/file-upload";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  ["payment", "Payment"], ["provider_issue", "Provider issue"], ["no_show", "Provider no-show"], ["pharmacy_order", "Pharmacy / order problem"],
  ["diagnostic", "Diagnostic issue"], ["appointment", "Appointment problem"], ["ambulance", "Ambulance / paramedic complaint"], ["other", "Other"],
] as const;

const KIND_TO_CATEGORY: Record<string, string> = { pharmacy: "pharmacy_order", diagnostic: "diagnostic", hospital: "appointment", ambulance: "ambulance", professional_care: "provider_issue" };

export default function NewDisputePage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<{ id: string; reference: string; kind: string }[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [category, setCategory] = useState("payment");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("bookings").select("id, reference, kind").eq("booker_id", user.id).order("created_at", { ascending: false }).limit(50);
      const list = (data ?? []) as { id: string; reference: string; kind: string }[];
      setBookings(list);
      const pre = new URLSearchParams(window.location.search).get("booking");
      const match = list.find((b) => b.id === pre);
      if (match) { setBookingId(match.id); setCategory(KIND_TO_CATEGORY[match.kind] ?? "other"); }
    }
    load();
  }, []);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/disputes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, booking_id: bookingId || undefined, subject, description, evidence_urls: evidence }),
    });
    const data = (await res.json()) as { id?: string; reference?: string; error?: unknown };
    setBusy(false);
    if (!res.ok || !data.id) { toast.error(typeof data.error === "string" ? data.error : "Please complete all fields"); return; }
    toast.success(`Dispute ${data.reference} opened`);
    router.push(`/disputes/${data.id}`);
  }

  return (
    <div className="animate-fade-in">
      <Header title="Open a dispute" subtitle="RGH reviews every dispute" />
      <div className="p-4 md:p-6 max-w-2xl">
        <Card><CardContent className="p-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bk">Linked booking / order</Label>
            <select id="bk" value={bookingId} onChange={(e) => setBookingId(e.target.value)} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
              <option value="">Not linked to a booking</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{b.reference} · {b.kind.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat">What is it about?</Label>
            <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label htmlFor="sub">Subject</Label><Input id="sub" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} /></div>
          <div className="space-y-1">
            <Label htmlFor="desc">What happened?</Label>
            <textarea id="desc" rows={5} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Evidence (receipts, screenshots, photos)</p>
            <FileUpload folder="dispute-evidence" label="Add evidence" onUploaded={(p) => setEvidence((e) => [...e, p])} />
            {evidence.length > 0 && <p className="text-xs text-[#64748B]">{evidence.length} file(s) attached</p>}
          </div>
          <div className="flex justify-end">
            <Button loading={busy} disabled={subject.trim().length < 4 || description.trim().length < 10} onClick={submit}>Submit dispute</Button>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
