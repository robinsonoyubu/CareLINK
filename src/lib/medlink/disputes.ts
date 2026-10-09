export const DISPUTE_CATEGORIES: Record<string, string> = {
  payment: "Payment", provider_issue: "Provider issue", no_show: "No-show", pharmacy_order: "Pharmacy / order",
  diagnostic: "Diagnostic", appointment: "Appointment", ambulance: "Ambulance / paramedic", other: "Other",
};

export function disputeTone(status: string) {
  return status === "resolved" || status === "closed" ? "completed" : status === "open" ? "pending" : "accent";
}
