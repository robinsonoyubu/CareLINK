import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/medlink/badges";
import { BOOKING_KIND_LABELS, BOOKING_KINDS, type BookingKind } from "@/lib/medlink/bookings";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "My Bookings" };

const FILTERS = [
  { key: "active", label: "Active", statuses: ["pending", "payment_pending", "payment_verification", "confirmed", "in_progress", "rgh_review", "matching", "waitlisted", "sample_collected", "results_ready", "processing", "out_for_delivery", "dispatched"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled", "declined"] },
] as const;

type Row = {
  id: string; reference: string; kind: BookingKind; status: string; payment_status: string; scheduled_at: string | null;
  amount: number | null; is_emergency: boolean; created_at: string;
  provider: { name: string } | null; service: { name: string } | null;
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; kind?: string }> }) {
  const { tab = "active", kind } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const filter = FILTERS.find((f) => f.key === tab) ?? FILTERS[0];
  let q = supabase
    .from("bookings")
    .select("id, reference, kind, status, payment_status, scheduled_at, amount, is_emergency, created_at, provider:service_providers(name), service:provider_services(name)")
    .eq("booker_id", user.id)
    .in("status", [...filter.statuses])
    .order("created_at", { ascending: false })
    .limit(100);
  if (kind && (BOOKING_KINDS as readonly string[]).includes(kind)) q = q.eq("kind", kind);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Row[];

  const href = (t: string, k?: string) => `/bookings?tab=${t}${k ? `&kind=${k}` : ""}`;

  return (
    <div className="animate-fade-in">
      <Header title="My Bookings" subtitle="Appointments, tests, orders, ambulance trips and professional care — in one place"
        actions={<Link href="/bookings/new"><Button size="sm"><Plus className="h-4 w-4" />Request professional care</Button></Link>} />
      <div className="p-4 md:p-6 space-y-4">
        <nav className="flex flex-wrap gap-2" aria-label="Booking status">
          {FILTERS.map((f) => (
            <Link key={f.key} href={href(f.key, kind)} aria-current={f.key === filter.key ? "page" : undefined}
              className={cn("rounded-full px-3 py-1 text-sm", f.key === filter.key ? "bg-[#0F4C81] text-white" : "bg-white border border-[#E2E8F0] text-[#374151]")}>
              {f.label}
            </Link>
          ))}
          <span className="mx-1 w-px bg-[#E2E8F0]" aria-hidden />
          <Link href={href(filter.key)} className={cn("rounded-full px-3 py-1 text-sm", !kind ? "bg-[#EBF4FF] text-[#0F4C81]" : "text-[#64748B]")}>All types</Link>
          {BOOKING_KINDS.map((k) => (
            <Link key={k} href={href(filter.key, k)} className={cn("rounded-full px-3 py-1 text-sm", kind === k ? "bg-[#EBF4FF] text-[#0F4C81]" : "text-[#64748B]")}>
              {BOOKING_KIND_LABELS[k]}
            </Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <CalendarCheck className="h-10 w-10 text-[#CBD5E1] mb-3" />
            <p className="text-sm text-[#64748B]">No {filter.label.toLowerCase()} bookings.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/bookings/${b.id}`}>
                  <Card className={cn("hover:shadow-md transition", b.is_emergency && "border-red-300")}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#64748B]">{BOOKING_KIND_LABELS[b.kind]}{b.is_emergency && <span className="ml-2 font-semibold text-red-600">EMERGENCY</span>} · {b.reference}</p>
                        <p className="font-medium text-[#0F172A] truncate">{[b.service?.name, b.provider?.name].filter(Boolean).join(" — ") || BOOKING_KIND_LABELS[b.kind]}</p>
                        <p className="text-xs text-[#94A3B8]">{b.scheduled_at ? formatDateTime(b.scheduled_at) : `Requested ${formatDateTime(b.created_at)}`}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {b.amount != null && <span className="text-sm font-semibold">{formatCurrency(b.amount)}</span>}
                        <PaymentStatusBadge status={b.payment_status} />
                        <BookingStatusBadge status={b.status} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
