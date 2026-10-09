"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency, isFuture } from "@/lib/utils";
import { PatientFields, emptyPatient, isPatientValid, patientPayload } from "./patient-fields";
import type { ServiceRow } from "./provider-directory";

type Kind = "hospital" | "diagnostic";
type Doctor = { id: string; full_name: string; specialty: string | null; department_id: string | null };

const STEPS: Record<Kind, string[]> = {
  hospital: ["Department / service", "Doctor", "Date & time", "Patient", "Confirm"],
  diagnostic: ["Test", "Collection", "Date & time", "Patient", "Confirm"],
};

function minDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ServiceBookingForm({ kind, providerId, services, doctors = [], initialServiceId }: {
  kind: Kind; providerId: string; services: ServiceRow[]; doctors?: Doctor[]; initialServiceId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [doctorId, setDoctorId] = useState("");
  const [collection, setCollection] = useState<"in_centre" | "home">("in_centre");
  const [address, setAddress] = useState("");
  const [when, setWhen] = useState("");
  const [patient, setPatient] = useState(emptyPatient);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const doctorOptions = useMemo(
    () => doctors.filter((d) => !d.department_id || d.department_id === serviceId),
    [doctors, serviceId]
  );
  const steps = STEPS[kind];

  const canNext = [
    !!service,
    kind === "hospital" ? true : collection === "in_centre" || address.trim().length > 3,
    isFuture(when),
    isPatientValid(patient),
    true,
  ][step];

  async function submit() {
    setSubmitting(true);
    const body = kind === "hospital"
      ? { kind, provider_id: providerId, service_id: serviceId, doctor_id: doctorId || undefined, scheduled_at: new Date(when).toISOString(), patient: patientPayload(patient), notes: notes || undefined }
      : { kind, provider_id: providerId, service_id: serviceId, collection_method: collection, pickup_address: collection === "home" ? address : undefined, scheduled_at: new Date(when).toISOString(), patient: patientPayload(patient), notes: notes || undefined };
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { id?: string; error?: unknown };
    setSubmitting(false);
    if (!res.ok || !data.id) { toast.error(typeof data.error === "string" ? data.error : "Please check your details and try again"); return; }
    toast.success("Booking created");
    router.push(`/bookings/${data.id}`);
  }

  const selectable = services.filter((s) => (kind === "hospital" ? ["department", "service"] : ["test"]).includes(s.category));

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <ol className="flex flex-wrap gap-2 text-xs" aria-label="Booking steps">
          {steps.map((label, i) => (
            <li key={label} className={cn("flex items-center gap-1 rounded-full px-2.5 py-1",
              i === step ? "bg-[#0F4C81] text-white" : i < step ? "bg-green-50 text-green-700" : "bg-[#F1F5F9] text-[#64748B]")}
              aria-current={i === step ? "step" : undefined}>
              {i < step && <Check className="h-3 w-3" />}{i + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">{kind === "hospital" ? "Choose a department or service" : "Choose a test"}</legend>
            {selectable.length === 0 && <p className="text-sm text-[#64748B]">Nothing is bookable here yet.</p>}
            {selectable.map((s) => (
              <label key={s.id} className={cn("flex items-start justify-between gap-3 rounded-lg border p-3 cursor-pointer",
                serviceId === s.id ? "border-[#0F4C81] bg-[#EBF4FF]/50" : "border-[#E2E8F0]")}>
                <span className="flex items-start gap-3">
                  <input type="radio" name="service" className="mt-1" checked={serviceId === s.id} onChange={() => { setServiceId(s.id); setDoctorId(""); }} />
                  <span>
                    <span className="block text-sm font-medium">{s.name}</span>
                    {s.description && <span className="block text-xs text-[#64748B]">{s.description}</span>}
                    {kind === "diagnostic" && (
                      <span className="block text-xs text-[#64748B]">
                        {s.home_collection ? "In-centre or home collection" : "In-centre only"}
                        {s.turnaround_hours ? ` · Results in ~${s.turnaround_hours}h` : ""}
                      </span>
                    )}
                  </span>
                </span>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {s.price != null && s.requires_payment ? formatCurrency(s.price) : kind === "hospital" ? "Pay at hospital / free" : "Price on request"}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {step === 1 && kind === "hospital" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium mb-2">Choose a doctor (optional)</legend>
            <label className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-3 cursor-pointer">
              <input type="radio" name="doctor" checked={!doctorId} onChange={() => setDoctorId("")} />
              <span className="text-sm">Any available doctor</span>
            </label>
            {doctorOptions.map((d) => (
              <label key={d.id} className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-3 cursor-pointer">
                <input type="radio" name="doctor" checked={doctorId === d.id} onChange={() => setDoctorId(d.id)} />
                <span className="text-sm">{d.full_name}{d.specialty && <span className="text-[#64748B]"> · {d.specialty}</span>}</span>
              </label>
            ))}
          </fieldset>
        )}

        {step === 1 && kind === "diagnostic" && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium mb-2">Where should the sample be collected?</legend>
            <label className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-3 cursor-pointer">
              <input type="radio" name="collection" checked={collection === "in_centre"} onChange={() => setCollection("in_centre")} />
              <span className="text-sm">At the centre</span>
            </label>
            <label className={cn("flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-3", service?.home_collection ? "cursor-pointer" : "opacity-50")}>
              <input type="radio" name="collection" disabled={!service?.home_collection} checked={collection === "home"} onChange={() => setCollection("home")} />
              <span className="text-sm">Home collection {!service?.home_collection && "(not offered for this test)"}</span>
            </label>
            {collection === "home" && (
              <div className="space-y-1">
                <Label htmlFor="addr">Collection address</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
              </div>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <div className="space-y-1 max-w-xs">
            <Label htmlFor="when">Preferred date & time</Label>
            <Input id="when" type="datetime-local" min={minDateTime()} value={when} onChange={(e) => setWhen(e.target.value)} />
            <p className="text-xs text-[#64748B]">The provider will confirm or suggest another time.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <PatientFields value={patient} onChange={setPatient} />
            <div className="space-y-1">
              <Label htmlFor="notes">Anything else the provider should know? (optional)</Label>
              <textarea id="notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {step === 4 && service && (
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-[#64748B]">{kind === "hospital" ? "Service" : "Test"}</dt><dd>{service.name}</dd>
            {kind === "hospital" && <><dt className="text-[#64748B]">Doctor</dt><dd>{doctors.find((d) => d.id === doctorId)?.full_name ?? "Any available"}</dd></>}
            {kind === "diagnostic" && <><dt className="text-[#64748B]">Collection</dt><dd>{collection === "home" ? `Home — ${address}` : "At the centre"}</dd></>}
            <dt className="text-[#64748B]">When</dt><dd>{new Date(when).toLocaleString("en-NG")}</dd>
            <dt className="text-[#64748B]">Patient</dt><dd>{patient.full_name} · {patient.phone}</dd>
            <dt className="text-[#64748B]">Price</dt>
            <dd className="font-semibold">{service.price != null && service.requires_payment ? `${formatCurrency(service.price)} — pay by bank transfer after booking` : "No online payment required"}</dd>
          </dl>
        )}

        <div className="flex justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < steps.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button loading={submitting} onClick={submit}>Confirm booking</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
