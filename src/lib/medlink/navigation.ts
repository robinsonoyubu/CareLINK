import type { UserRole } from "@/types";

/**
 * MedLINK v8 primary navigation. Do not re-add the removed duplicate sections
 * (My Health, Family Healthcare, Find Care, Nearby Care, Home Care).
 */
export const PRIMARY_NAV = [
  { key: "home", label: "Home", href: "/dashboard" },
  { key: "hospitals", label: "Hospitals", href: "/hospitals" },
  { key: "diagnostics", label: "Diagnostics", href: "/diagnostics" },
  { key: "pharmacy", label: "Pharmacy", href: "/pharmacy" },
  { key: "ambulance", label: "Ambulance & Paramedics", href: "/ambulance" },
  { key: "earn", label: "Earn", href: "/earn" },
  { key: "gist", label: "Health Gist", href: "/health-gist" },
  { key: "bookings", label: "My Bookings", href: "/bookings" },
  { key: "chats", label: "My Chats", href: "/chats" },
  { key: "notifications", label: "Notifications", href: "/notifications" },
  { key: "profile", label: "Profile", href: "/profile" },
] as const;

export const REMOVED_SECTIONS = ["My Health", "Family Healthcare", "Find Care", "Nearby Care", "Home Care"] as const;

export type WorkspaceNavKey =
  | "attendance"
  | "facility_attendance"
  | "workforce"
  | "professionals"
  | "organizations"
  | "staff_requests"
  | "assignments"
  | "scheduling"
  | "performance"
  | "career"
  | "provider_portal"
  | "rgh_ops"
  | "disputes"
  | "assistant";

/** Role-specific workspace links shown under the primary navigation. */
export const WORKSPACE_NAV: { key: WorkspaceNavKey; label: string; href: string; roles: UserRole[] }[] = [
  { key: "assistant", label: "AI Health Assistant", href: "/assistant", roles: ["client", "professional", "organization", "provider", "admin"] },
  { key: "disputes", label: "Dispute Centre", href: "/disputes", roles: ["client", "professional", "organization", "provider", "admin"] },
  { key: "attendance", label: "My Attendance", href: "/attendance", roles: ["professional"] },
  { key: "assignments", label: "Assignments", href: "/assignments", roles: ["admin", "professional"] },
  { key: "scheduling", label: "Scheduling", href: "/scheduling", roles: ["admin", "professional"] },
  { key: "performance", label: "Performance", href: "/performance", roles: ["admin", "professional"] },
  { key: "career", label: "Career Center", href: "/career-center", roles: ["professional"] },
  { key: "staff_requests", label: "Staff Requests", href: "/organizations/requests", roles: ["organization"] },
  { key: "facility_attendance", label: "Facility Attendance", href: "/attendance/facility", roles: ["organization", "admin"] },
  { key: "provider_portal", label: "Provider Portal", href: "/provider", roles: ["provider"] },
  { key: "workforce", label: "Workforce", href: "/workforce", roles: ["admin"] },
  { key: "professionals", label: "Professionals", href: "/professionals", roles: ["admin"] },
  { key: "organizations", label: "Organizations", href: "/organizations", roles: ["admin"] },
  { key: "rgh_ops", label: "RGH Operations", href: "/admin", roles: ["admin"] },
];

export function workspaceNavFor(role: UserRole) {
  return WORKSPACE_NAV.filter((i) => i.roles.includes(role));
}
