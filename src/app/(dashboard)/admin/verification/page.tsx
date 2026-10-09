import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileLink } from "@/components/medlink/file-upload";
import { ApplicationActions } from "@/components/admin/admin-actions";
import { requireRghAdmin } from "@/lib/medlink/admin";
import { humanizeProfession, cn } from "@/lib/utils";

export const metadata = { title: "Professional Verification" };

type Row = {
  id: string; profession: string; application_status: string; marital_status: string | null; rejection_reason: string | null; created_at: string;
  profile: { full_name: string; email: string; phone: string | null; address: string | null } | null;
  credentials: { nin: string | null; government_id_url: string | null; passport_photo_url: string | null; license_kind: string | null; license_number: string | null; license_document_url: string | null; license_expiry_date: string | null; certificate_kind: string | null; certificate_url: string | null } | null;
  guarantors: { full_name: string; phone: string; email: string | null; occupation: string; relationship: string; government_id_url: string | null; passport_url: string | null }[];
};

const STATUSES = ["submitted", "under_review", "rgh_verification", "verified", "rejected"] as const;

export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw = "pending" } = await searchParams;
  const status = (STATUSES as readonly string[]).includes(raw) ? (raw as (typeof STATUSES)[number]) : "pending";
  const { supabase } = await requireRghAdmin();
  let q = supabase.from("professionals")
    .select("id, profession, application_status, marital_status, rejection_reason, created_at, profile:profiles(full_name, email, phone, address), credentials:professional_credentials(*), guarantors(full_name, phone, email, occupation, relationship, government_id_url, passport_url)")
    .order("created_at", { ascending: true }).limit(100);
  q = status === "pending" ? q.in("application_status", ["submitted", "under_review", "rgh_verification"]) : q.eq("application_status", status);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="animate-fade-in">
      <Header title="Professional Verification" subtitle="Application Submitted → Under Review → RGH Verification → Verified / Rejected" />
      <div className="p-4 md:p-6 space-y-4">
        <p className="text-xs text-[#64748B]">Sensitive documents on this page are for authorised RGH personnel only. Access is logged.</p>
        <nav className="flex gap-2">
          {["pending", "verified", "rejected"].map((s) => (
            <Link key={s} href={`/admin/verification?status=${s}`} className={cn("rounded-full px-3 py-1 text-sm capitalize", s === status ? "bg-[#0F4C81] text-white" : "bg-white border border-[#E2E8F0]")}>{s}</Link>
          ))}
        </nav>
        {rows.length === 0 && <p className="py-10 text-center text-sm text-[#64748B]">No applications.</p>}
        {rows.map((r) => {
          const c = r.credentials;
          const g = r.guarantors[0];
          const expired = c?.license_expiry_date && new Date(c.license_expiry_date) < new Date();
          return (
            <Card key={r.id}><CardContent className="p-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/professionals/${r.id}`} className="font-semibold hover:underline">{r.profile?.full_name}</Link>
                  <p className="text-xs text-[#64748B]">{humanizeProfession(r.profession)} · {r.profile?.email} · {r.profile?.phone ?? "no phone"} · {r.marital_status ?? "marital status missing"}</p>
                </div>
                <Badge variant={r.application_status === "verified" ? "verified" : r.application_status === "rejected" ? "cancelled" : "pending"}>{r.application_status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md bg-[#F8FAFC] p-3 space-y-1">
                  <p className="font-medium">Identity & credentials</p>
                  <p>NIN: {c?.nin ? `•••••••${c.nin.slice(-4)}` : <span className="text-red-600">missing</span>}</p>
                  <p className="flex flex-wrap gap-3"><FileLink path={c?.passport_photo_url} label="Passport photo" /><FileLink path={c?.government_id_url} label="Government ID" />
                    {!c?.passport_photo_url && <span className="text-red-600">passport missing</span>}{!c?.government_id_url && <span className="text-red-600">ID missing</span>}</p>
                  {r.profession === "nurse" && (
                    <p>{c?.license_kind === "notification_number" ? "Notification no." : "Licence no."}: {c?.license_number ?? <span className="text-red-600">missing</span>}
                      {c?.license_expiry_date && <span className={expired ? "text-red-600" : ""}> · expires {c.license_expiry_date}{expired && " (EXPIRED)"}</span>} <FileLink path={c?.license_document_url} label="document" /></p>
                  )}
                  {["caregiver", "nurse_assistant"].includes(r.profession) && (
                    <p>{c?.certificate_kind?.replace("_", " ") ?? "Certificate"}: {c?.certificate_url ? <FileLink path={c.certificate_url} label="view" /> : <span className="text-red-600">missing</span>}</p>
                  )}
                </div>
                <div className="rounded-md bg-[#F8FAFC] p-3 space-y-1">
                  <p className="font-medium">Guarantor</p>
                  {g ? (
                    <>
                      <p>{g.full_name} · {g.relationship} · {g.occupation}</p>
                      <p>{g.phone}{g.email ? ` · ${g.email}` : ""}</p>
                      <p className="flex gap-3"><FileLink path={g.government_id_url} label="Government ID" /><FileLink path={g.passport_url} label="Passport photo" /></p>
                    </>
                  ) : <p className="text-red-600">No guarantor</p>}
                </div>
              </div>
              {r.rejection_reason && <p className="text-red-700">Rejected: {r.rejection_reason}</p>}
              <ApplicationActions professionalId={r.id} status={r.application_status} />
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}
