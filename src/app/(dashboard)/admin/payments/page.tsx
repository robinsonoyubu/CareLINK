import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/medlink/badges";
import { requireRghAdmin } from "@/lib/medlink/admin";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Professional-care requests" };

export default async function AdminPaymentsPage() {
  const { supabase } = await requireRghAdmin();
  const { data } = await supabase.from("bookings")
    .select("id, reference, status, payment_status, amount, scheduled_at, created_at, items, patient_details")
    .eq("kind", "professional_care").not("status", "in", "(completed,cancelled,declined)")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as { id: string; reference: string; status: string; payment_status: string; amount: number | null; scheduled_at: string | null; created_at: string; items: { service?: string; duration?: string }[]; patient_details: { full_name?: string } }[];
  const groups = [
    { title: "Awaiting RGH review & quote", rows: rows.filter((r) => r.payment_status === "awaiting_quote") },
    { title: "Proof submitted — verify transfer", rows: rows.filter((r) => r.payment_status === "proof_submitted") },
    { title: "Awaiting client transfer", rows: rows.filter((r) => ["awaiting_transfer", "rejected"].includes(r.payment_status)) },
    { title: "Matching & assignment", rows: rows.filter((r) => r.payment_status === "verified") },
  ];

  return (
    <div className="animate-fade-in">
      <Header title="Professional-care requests" subtitle="Request → RGH Review → Quote → Transfer → Proof → RGH Verification → Matching/Assignment" />
      <div className="p-4 md:p-6 space-y-6">
        {groups.map((g) => (
          <section key={g.title} className="space-y-2">
            <h2 className="text-sm font-semibold">{g.title} ({g.rows.length})</h2>
            {g.rows.map((r) => (
              <Link key={r.id} href={`/bookings/${r.id}`} className="block">
                <Card className="hover:shadow-md"><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span><span className="font-mono">{r.reference}</span> · {r.patient_details?.full_name} · {r.items?.[0]?.service?.replace(/_/g, " ")} ({r.items?.[0]?.duration})
                    <span className="block text-xs text-[#64748B]">Requested {formatDateTime(r.created_at)}{r.scheduled_at && ` · starts ${formatDateTime(r.scheduled_at)}`}{r.amount != null && ` · ${formatCurrency(Number(r.amount))}`}</span></span>
                  <span className="flex gap-2"><PaymentStatusBadge status={r.payment_status} /><BookingStatusBadge status={r.status} /></span>
                </CardContent></Card>
              </Link>
            ))}
          </section>
        ))}
        <p className="text-xs text-[#64748B]">After payment verification, create the assignment from <Link className="underline" href="/assignments/new">Assignments → New</Link> (matching by profession, verification, availability, location, skills, qualifications, licence validity, prior assignments and workforce status).</p>
      </div>
    </div>
  );
}
