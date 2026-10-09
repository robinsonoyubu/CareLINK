import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, statusTone, type BookingStatus } from "@/lib/medlink/bookings";
import { cn } from "@/lib/utils";

export function BookingStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={statusTone(status)} className={className}>
      {STATUS_LABELS[status as BookingStatus] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  not_required: "No payment needed",
  awaiting_quote: "Awaiting quote",
  awaiting_transfer: "Awaiting transfer",
  proof_submitted: "Proof submitted",
  verified: "Payment verified",
  rejected: "Proof rejected",
  refunded: "Refunded",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const tone = status === "verified" ? "completed" : status === "rejected" ? "cancelled" : status === "not_required" ? "outline" : "pending";
  return <Badge variant={tone}>{PAYMENT_LABELS[status] ?? status}</Badge>;
}

/** Public trust marker. Never reveals the documents behind the verification. */
export function RghVerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700", className)}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> RGH Verified
    </span>
  );
}

export function RatingSummary({ avg, count }: { avg: number | null; count: number }) {
  if (!count || avg == null) return <span className="text-xs text-[#94A3B8]">No ratings yet</span>;
  return (
    <span className="text-xs text-[#374151]">
      <span className="text-amber-500" aria-hidden>★</span> {Number(avg).toFixed(1)} <span className="text-[#94A3B8]">({count})</span>
    </span>
  );
}

/** Shown only when enough data exists to be meaningful. */
export function ResponseTime({ minutes, sample }: { minutes: number | null; sample: number }) {
  if (minutes == null || sample < 10) return null;
  const label = minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
  return <span className="text-xs text-[#64748B]">Usually replies in ~{label}</span>;
}
