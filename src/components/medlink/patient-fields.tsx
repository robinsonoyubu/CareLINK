"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PatientInfo {
  full_name: string;
  phone: string;
  age?: string;
  gender?: "male" | "female" | "other" | "";
  condition?: string;
  relationship?: string;
}

export const emptyPatient: PatientInfo = { full_name: "", phone: "", age: "", gender: "", condition: "", relationship: "self" };

export function patientPayload(p: PatientInfo) {
  return {
    full_name: p.full_name.trim(),
    phone: p.phone.trim(),
    ...(p.age ? { age: Number(p.age) } : {}),
    ...(p.gender ? { gender: p.gender } : {}),
    ...(p.condition?.trim() ? { condition: p.condition.trim() } : {}),
    ...(p.relationship ? { relationship: p.relationship } : {}),
  };
}

export function PatientFields({ value, onChange, conditionLabel = "Reason for visit / symptoms (optional)" }: {
  value: PatientInfo; onChange: (v: PatientInfo) => void; conditionLabel?: string;
}) {
  const set = (k: keyof PatientInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor="p-name">Patient full name</Label>
        <Input id="p-name" value={value.full_name} onChange={set("full_name")} required autoComplete="name" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-phone">Phone</Label>
        <Input id="p-phone" type="tel" value={value.phone} onChange={set("phone")} required autoComplete="tel" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-age">Age</Label>
        <Input id="p-age" type="number" min={0} max={130} value={value.age} onChange={set("age")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-gender">Gender</Label>
        <select id="p-gender" value={value.gender} onChange={set("gender")} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-rel">Booking for</Label>
        <select id="p-rel" value={value.relationship} onChange={set("relationship")} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
          <option value="self">Myself</option>
          <option value="child">My child</option>
          <option value="parent">My parent</option>
          <option value="spouse">My spouse</option>
          <option value="other">Someone else</option>
        </select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="p-cond">{conditionLabel}</Label>
        <textarea id="p-cond" value={value.condition} onChange={set("condition")} rows={2} maxLength={500}
          className="flex w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
      </div>
    </div>
  );
}

export function isPatientValid(p: PatientInfo) {
  return p.full_name.trim().length >= 2 && p.phone.trim().length >= 7;
}
