"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PatientFields, emptyPatient, isPatientValid, patientPayload } from "@/components/medlink/patient-fields";

const SERVICES = [
  { value: "nursing", label: "Nursing care" },
  { value: "caregiver", label: "Caregiver / nurse assistant" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "doctor_visit", label: "Doctor visit" },
  { value: "other", label: "Other" },
];

const DURATIONS = [
  { value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }, { value: "live_in", label: "Live-in" },
];

/** Request → RGH Review → Quote/Payment Instructions → Transfer → Proof → RGH Verification → Matching/Assignment. */
export default function NewProfessionalCarePage() {
  const router = useRouter();
  const [service, setService] = useState("nursing");
  const [duration, setDuration] = useState("daily");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [patient, setPatient] = useState(emptyPatient);
  const [submitting, setSubmitting] = useState(false);

  const valid = location.trim().length > 3 && !!start && new Date(start) > new Date() && isPatientValid(patient);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "professional_care", service, duration, location, scheduled_at: new Date(start).toISOString(),
        recurrence_rule: recurring ? `FREQ=${duration === "weekly" ? "WEEKLY" : duration === "monthly" ? "MONTHLY" : "DAILY"}` : undefined,
        notes: notes || undefined, patient: patientPayload(patient),
      }),
    });
    const data = (await res.json()) as { id?: string; error?: unknown };
    setSubmitting(false);
    if (!res.ok || !data.id) { toast.error(typeof data.error === "string" ? data.error : "Please check the form"); return; }
    toast.success("Request sent to RGH");
    router.push(`/bookings/${data.id}`);
  }

  return (
    <div className="animate-fade-in">
      <Header title="Request professional care" subtitle="RGH reviews every request and assigns an RGH-verified professional" />
      <div className="p-4 md:p-6 max-w-3xl">
        <Card>
          <CardContent className="p-5 space-y-4">
            <ol className="text-xs text-[#64748B] flex flex-wrap gap-x-2">
              {["Request", "RGH review", "Quote & payment instructions", "Transfer + proof", "RGH verification", "Matching & assignment"].map((s, i) => (
                <li key={s}>{i + 1}. {s}{i < 5 && " →"}</li>
              ))}
            </ol>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="svc">Service</Label>
                <select id="svc" value={service} onChange={(e) => setService(e.target.value)} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                  {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dur">Duration</Label>
                <select id="dur" value={duration} onChange={(e) => setDuration(e.target.value)} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                  {DURATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="loc">Where is care needed?</Label>
                <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} autoComplete="street-address" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="start">Start</Label>
                <Input id="start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm self-end pb-2">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Recurring schedule
              </label>
            </div>
            <PatientFields value={patient} onChange={setPatient} conditionLabel="Care needs / condition" />
            <div className="space-y-1">
              <Label htmlFor="notes">Additional requirements (optional)</Label>
              <textarea id="notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end"><Button disabled={!valid} loading={submitting} onClick={submit}>Send request to RGH</Button></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
