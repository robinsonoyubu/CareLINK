"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import { PatientFields, emptyPatient, isPatientValid, patientPayload } from "./patient-fields";
import type { ServiceRow } from "./provider-directory";

const VEHICLE_LABELS: Record<string, string> = {
  basic_life_support: "Basic Life Support",
  advanced_life_support: "Advanced Life Support",
  patient_transport: "Patient Transport",
  neonatal: "Neonatal",
  other: "Other",
};

/** Non-emergency: Vehicle → Pickup → Destination → Patient → Price → Payment → Confirmation. */
export function AmbulanceBookingForm({ providerId, vehicles }: { providerId: string; vehicles: ServiceRow[] }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(vehicles.find((v) => v.is_available)?.id ?? "");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [when, setWhen] = useState("");
  const [patient, setPatient] = useState(emptyPatient);
  const [submitting, setSubmitting] = useState(false);
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const valid = !!vehicle && pickup.trim().length > 3 && destination.trim().length > 3 && !!when && new Date(when) > new Date() && isPatientValid(patient);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "ambulance", is_emergency: false, provider_id: providerId, service_id: vehicleId,
        pickup_address: pickup, destination_address: destination, scheduled_at: new Date(when).toISOString(),
        patient: patientPayload(patient),
      }),
    });
    const data = (await res.json()) as { id?: string; error?: unknown };
    setSubmitting(false);
    if (!res.ok || !data.id) { toast.error(typeof data.error === "string" ? data.error : "Could not book"); return; }
    router.push(`/bookings/${data.id}`);
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-1">Vehicle</legend>
          {vehicles.length === 0 && <p className="text-sm text-[#64748B]">No vehicles listed.</p>}
          {vehicles.map((v) => (
            <label key={v.id} className={cn("flex items-start justify-between gap-3 rounded-lg border p-3", v.is_available ? "cursor-pointer" : "opacity-50",
              vehicleId === v.id ? "border-[#0F4C81] bg-[#EBF4FF]/50" : "border-[#E2E8F0]")}>
              <span className="flex items-start gap-3">
                <input type="radio" name="vehicle" className="mt-1" disabled={!v.is_available} checked={vehicleId === v.id} onChange={() => setVehicleId(v.id)} />
                <span>
                  <span className="block text-sm font-medium">{v.name} {v.vehicle_type && <span className="text-[#64748B] font-normal">· {VEHICLE_LABELS[v.vehicle_type]}</span>}</span>
                  {v.equipment.length > 0 && <span className="block text-xs text-[#64748B]">Equipment: {v.equipment.join(", ")}</span>}
                  {!v.is_available && <span className="block text-xs text-red-600">Currently unavailable</span>}
                </span>
              </span>
              <span className="text-sm font-semibold whitespace-nowrap">{v.price != null ? formatCurrency(v.price) : "Quote"}</span>
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="pk">Pickup</Label><Input id="pk" value={pickup} onChange={(e) => setPickup(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="ds">Destination</Label><Input id="ds" value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="wh">Date & time</Label><Input id="wh" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        </div>
        <PatientFields value={patient} onChange={setPatient} conditionLabel="Patient condition / mobility needs" />
        <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-3">
          <span className="text-sm">Price: <strong>{vehicle?.price != null ? formatCurrency(vehicle.price) : "—"}</strong> <span className="text-xs text-[#64748B]">(bank transfer)</span></span>
          <Button disabled={!valid} loading={submitting} onClick={submit}>Confirm booking</Button>
        </div>
      </CardContent>
    </Card>
  );
}
