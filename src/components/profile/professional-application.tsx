"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { FileUpload } from "@/components/medlink/file-upload";
import { RghVerifiedBadge } from "@/components/medlink/badges";

type Cred = {
  nin: string | null; government_id_url: string | null; passport_photo_url: string | null;
  license_kind: string | null; license_number: string | null; license_document_url: string | null; license_expiry_date: string | null;
  certificate_kind: string | null; certificate_url: string | null;
};
type Guarantor = { id?: string; full_name: string; phone: string; email: string | null; residential_address: string; occupation: string; relationship: string; government_id_url: string | null; passport_url: string | null };

function guarantorFields(g: Guarantor) {
  return {
    full_name: g.full_name.trim(), phone: g.phone.trim(), email: g.email?.trim() || null, residential_address: g.residential_address.trim(),
    occupation: g.occupation.trim(), relationship: g.relationship.trim(), government_id_url: g.government_id_url, passport_url: g.passport_url,
  };
}

const STAGES = ["submitted", "under_review", "rgh_verification", "verified"] as const;
const STAGE_LABEL: Record<string, string> = { submitted: "Application Submitted", under_review: "Under Review", rgh_verification: "RGH Verification", verified: "Verified", rejected: "Rejected" };

/**
 * Nurses: licence OR notification number (+ practising licence expiry).
 * Caregivers / nurse assistants: training OR competency certificate.
 * Everyone: NIN, government ID, passport photograph and a guarantor.
 */
export function ProfessionalApplication({ professionalId, profession, maritalStatus, status, rejectionReason, credentials, guarantor }: {
  professionalId: string; profession: string; maritalStatus: string | null; status: string; rejectionReason: string | null;
  credentials: Cred | null; guarantor: Guarantor | null;
}) {
  const router = useRouter();
  const [marital, setMarital] = useState(maritalStatus ?? "");
  const [c, setC] = useState<Cred>(credentials ?? { nin: "", government_id_url: null, passport_photo_url: null, license_kind: profession === "nurse" ? "professional_license" : null, license_number: "", license_document_url: null, license_expiry_date: null, certificate_kind: ["caregiver", "nurse_assistant"].includes(profession) ? "training_certificate" : null, certificate_url: null });
  const [g, setG] = useState<Guarantor>(guarantor ?? { full_name: "", phone: "", email: "", residential_address: "", occupation: "", relationship: "", government_id_url: null, passport_url: null });
  const [busy, setBusy] = useState(false);
  const isNurse = profession === "nurse";
  const isCarer = ["caregiver", "nurse_assistant"].includes(profession);

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const results = await Promise.all([
      supabase.from("professionals").update({ marital_status: (marital || null) as never }).eq("id", professionalId),
      supabase.from("professional_credentials").upsert({ professional_id: professionalId, ...c, nin: c.nin?.trim() || null, license_number: c.license_number?.trim() || null, updated_at: new Date().toISOString() }),
      g.id
        ? supabase.from("guarantors").update(guarantorFields(g)).eq("id", g.id)
        : g.full_name.trim() ? supabase.from("guarantors").insert({ ...guarantorFields(g), professional_id: professionalId }) : Promise.resolve({ error: null }),
    ]);
    setBusy(false);
    const err = results.find((r) => r.error)?.error;
    if (err) { toast.error(err.message); return; }
    toast.success("Saved. RGH will review your documents.");
    router.refresh();
  }

  const doc = (label: string, key: keyof Cred, folder: string) => (
    <div className="space-y-1"><p className="text-sm">{label}</p>
      <FileUpload folder={folder} label="Upload" value={c[key] as string | null} onUploaded={(p) => setC({ ...c, [key]: p })} /></div>
  );

  return (
    <div className="max-w-3xl space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Verification status</p>
          {status === "verified" ? <RghVerifiedBadge /> : <Badge variant={status === "rejected" ? "cancelled" : "pending"}>{STAGE_LABEL[status]}</Badge>}
        </div>
        <ol className="flex flex-wrap gap-2 text-xs">
          {STAGES.map((s, i) => (
            <li key={s} className={`rounded-full px-2.5 py-1 ${STAGES.indexOf(status as never) >= i ? "bg-green-50 text-green-700" : "bg-[#F1F5F9] text-[#64748B]"}`}>{STAGE_LABEL[s]}</li>
          ))}
        </ol>
        {rejectionReason && status === "rejected" && <p className="text-sm text-red-700">Reason: {rejectionReason}</p>}
        <p className="flex items-center gap-1 text-xs text-[#64748B]"><Lock className="h-3 w-3" />Documents below are visible only to you and authorised RGH personnel.</p>
      </CardContent></Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Identity & credentials</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1"><Label htmlFor="ms">Marital status</Label>
            <select id="ms" value={marital} onChange={(e) => setMarital(e.target.value)} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
              <option value="">Select…</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option><option value="other">Other</option>
            </select></div>
          <div className="space-y-1"><Label htmlFor="nin">NIN</Label><Input id="nin" inputMode="numeric" maxLength={11} value={c.nin ?? ""} onChange={(e) => setC({ ...c, nin: e.target.value.replace(/\D/g, "") })} /></div>
          {doc("Passport photograph", "passport_photo_url", "credentials")}
          {doc("Government ID", "government_id_url", "credentials")}
          {isNurse && (
            <>
              <div className="space-y-1"><Label htmlFor="lk">Licence type</Label>
                <select id="lk" value={c.license_kind ?? ""} onChange={(e) => setC({ ...c, license_kind: e.target.value })} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                  <option value="professional_license">Professional licence</option><option value="notification_number">Notification number</option>
                </select></div>
              <div className="space-y-1"><Label htmlFor="ln">{c.license_kind === "notification_number" ? "Notification number" : "Licence number"}</Label>
                <Input id="ln" value={c.license_number ?? ""} onChange={(e) => setC({ ...c, license_number: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="le">Practising licence expiry date{c.license_kind === "notification_number" && " (if applicable)"}</Label>
                <Input id="le" type="date" value={c.license_expiry_date ?? ""} onChange={(e) => setC({ ...c, license_expiry_date: e.target.value || null })} /></div>
              {doc("Licence / notification document", "license_document_url", "credentials")}
            </>
          )}
          {isCarer && (
            <>
              <div className="space-y-1"><Label htmlFor="ck">Certificate</Label>
                <select id="ck" value={c.certificate_kind ?? ""} onChange={(e) => setC({ ...c, certificate_kind: e.target.value })} className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm">
                  <option value="training_certificate">Training certificate</option><option value="competency_certificate">Competency certificate</option>
                </select></div>
              {doc("Certificate document", "certificate_url", "credentials")}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Guarantor</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([["full_name", "Full name"], ["phone", "Phone"], ["email", "Email"], ["residential_address", "Address"], ["occupation", "Occupation"], ["relationship", "Relationship to you"]] as const).map(([k, l]) => (
            <div key={k} className="space-y-1"><Label htmlFor={`g-${k}`}>{l}</Label><Input id={`g-${k}`} value={g[k] ?? ""} onChange={(e) => setG({ ...g, [k]: e.target.value })} /></div>
          ))}
          <div className="space-y-1"><p className="text-sm">Guarantor government ID</p><FileUpload folder="guarantor" label="Upload" value={g.government_id_url} onUploaded={(p) => setG({ ...g, government_id_url: p })} /></div>
          <div className="space-y-1"><p className="text-sm">Guarantor passport photograph</p><FileUpload folder="guarantor" label="Upload" value={g.passport_url} onUploaded={(p) => setG({ ...g, passport_url: p })} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button loading={busy} onClick={save}>Save application</Button></div>
    </div>
  );
}
