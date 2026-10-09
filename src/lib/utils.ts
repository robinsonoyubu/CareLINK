import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, pattern = "MMM d, yyyy") {
  return format(new Date(date), pattern);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number) {
  return text.length > length ? text.slice(0, length) + "…" : text;
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function humanizeRole(role: string) {
  const map: Record<string, string> = {
    admin: "RGH Administrator",
    professional: "Healthcare Professional",
    organization: "Organization",
    client: "Client",
    provider: "Service Provider",
  };
  return map[role] ?? capitalize(role);
}

export function humanizeProfession(profession: string) {
  const map: Record<string, string> = {
    nurse: "Nurse",
    nurse_assistant: "Nurse Assistant",
    caregiver: "Caregiver",
    physiotherapist: "Physiotherapist",
    doctor: "Doctor",
    occupational_therapist: "Occupational Therapist",
    health_attendant: "Health Attendant",
  };
  return map[profession] ?? capitalize(profession.replace(/_/g, " "));
}

export function humanizeStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreToGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function generateAvatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F4C81&color=fff&size=128`;
}

/** ISO timestamp `ms` from now (negative for the past). */
export function isoFromNow(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

/** True when a date/datetime-local string is in the future. */
export function isFuture(value: string | null | undefined) {
  return !!value && new Date(value).getTime() > Date.now();
}
