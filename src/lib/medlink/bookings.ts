/**
 * My Bookings is the single booking hub. Every bookable thing — professional
 * care, hospital appointments, diagnostics, pharmacy orders and ambulance
 * trips — is a row in `bookings` with a shared status model plus a few
 * service-specific statuses.
 */

export const BOOKING_KINDS = ["professional_care", "hospital", "diagnostic", "pharmacy", "ambulance"] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export const BOOKING_STATUSES = [
  "pending",
  "payment_pending",
  "payment_verification",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  // service-specific
  "declined",
  "waitlisted",
  "rgh_review",
  "matching",
  "sample_collected",
  "results_ready",
  "processing",
  "out_for_delivery",
  "dispatched",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "not_required",
  "awaiting_quote",
  "awaiting_transfer",
  "proof_submitted",
  "verified",
  "rejected",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_KIND_LABELS: Record<BookingKind, string> = {
  professional_care: "Professional care",
  hospital: "Hospital appointment",
  diagnostic: "Diagnostic test",
  pharmacy: "Pharmacy order",
  ambulance: "Ambulance & paramedics",
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  payment_pending: "Payment Pending",
  payment_verification: "Payment Verification",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
  waitlisted: "Waitlisted",
  rgh_review: "RGH Review",
  matching: "Matching",
  sample_collected: "Sample Collected",
  results_ready: "Results Ready",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  dispatched: "Dispatched",
};

const TERMINAL: BookingStatus[] = ["completed", "cancelled", "declined"];

/** Allowed status moves. Kept deliberately permissive within a kind; the DB trigger re-checks. */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["payment_pending", "confirmed", "rgh_review", "waitlisted", "declined", "cancelled", "dispatched"],
  rgh_review: ["payment_pending", "matching", "declined", "cancelled"],
  payment_pending: ["payment_verification", "cancelled"],
  payment_verification: ["confirmed", "matching", "processing", "payment_pending", "cancelled"],
  matching: ["confirmed", "cancelled"],
  waitlisted: ["pending", "confirmed", "cancelled"],
  confirmed: ["in_progress", "dispatched", "sample_collected", "processing", "completed", "cancelled"],
  processing: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed"],
  dispatched: ["in_progress", "completed", "cancelled"],
  sample_collected: ["results_ready"],
  in_progress: ["completed", "results_ready"],
  results_ready: ["completed"],
  completed: [],
  cancelled: [],
  declined: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: BookingStatus) {
  return TERMINAL.includes(status);
}

/** The booker may cancel or reschedule until the service is underway. */
export function bookerCanModify(status: BookingStatus) {
  return ["pending", "payment_pending", "payment_verification", "rgh_review", "matching", "waitlisted", "confirmed"].includes(status);
}

/** Ratings are unlocked only by a completed MedLINK transaction. */
export function canRate(status: BookingStatus) {
  return status === "completed";
}

export function statusTone(status: string): "pending" | "active" | "completed" | "cancelled" | "accent" {
  if (status === "completed" || status === "results_ready") return "completed";
  if (["cancelled", "declined"].includes(status)) return "cancelled";
  if (["confirmed", "in_progress", "dispatched", "out_for_delivery", "sample_collected"].includes(status)) return "active";
  if (["payment_pending", "payment_verification"].includes(status)) return "accent";
  return "pending";
}

/** Human-readable reference such as MLB-7K3Q9X. Ambiguous characters (0/O, 1/I) are excluded. */
export function makeReference(prefix: "MLB" | "DSP" | "WDR", random: () => number = Math.random) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return `${prefix}-${out}`;
}
