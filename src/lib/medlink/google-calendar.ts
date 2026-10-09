import { createServiceClient } from "@/lib/supabase/server";
import { BOOKING_KIND_LABELS, type BookingKind } from "./bookings";

/**
 * Google Calendar is an extra reminder channel. MedLINK stays the primary
 * booking record; events are added only after the user explicitly connects
 * their calendar (Profile → Settings → Calendar Integration).
 */

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_STATUSES = ["confirmed", "in_progress", "dispatched", "sample_collected", "processing"];

export function isCalendarConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/calendar/google/callback`;
}

export function googleAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: `${SCOPE} openid email`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`);
  return res.json() as Promise<TokenResponse>;
}

export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
}

export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export interface CalendarBooking {
  id: string;
  reference: string;
  kind: BookingKind;
  scheduled_at: string | null;
  ends_at: string | null;
  pickup_address: string | null;
  collection_method: string | null;
  notes: string | null;
  provider?: { name: string; address: string | null } | null;
  service?: { name: string } | null;
}

const DEFAULT_MINUTES: Record<BookingKind, number> = {
  professional_care: 120, hospital: 30, diagnostic: 30, pharmacy: 30, ambulance: 60,
};

export function buildCalendarEvent(b: CalendarBooking, appUrl: string) {
  if (!b.scheduled_at) return null;
  const start = new Date(b.scheduled_at);
  const end = b.ends_at ? new Date(b.ends_at) : new Date(start.getTime() + DEFAULT_MINUTES[b.kind] * 60_000);
  const what = [b.service?.name, b.provider?.name].filter(Boolean).join(" — ") || BOOKING_KIND_LABELS[b.kind];
  const location = b.collection_method === "home" || b.kind === "professional_care" || b.kind === "ambulance"
    ? b.pickup_address
    : b.provider?.address;
  const instructions = [
    `Booking reference: ${b.reference}`,
    b.notes ? `Notes: ${b.notes}` : null,
    `Manage this booking in MedLINK: ${appUrl}/bookings/${b.id}`,
    "MedLINK is the primary record — check it for the latest status.",
  ].filter(Boolean).join("\n");
  return {
    summary: `MedLINK: ${what}`,
    description: instructions,
    location: location ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: true },
    extendedProperties: { private: { medlinkBookingId: b.id } },
  };
}

async function accessTokenFor(profileId: string) {
  const service = await createServiceClient();
  const { data: integ } = await service.from("calendar_integrations").select("*").eq("profile_id", profileId).maybeSingle();
  if (!integ) return null;
  if (integ.expires_at && new Date(integ.expires_at).getTime() - 60_000 > Date.now()) {
    return { token: integ.access_token as string, calendarId: integ.calendar_id as string, autoAdd: integ.auto_add as boolean };
  }
  if (!integ.refresh_token) return null;
  const t = await tokenRequest({ refresh_token: integ.refresh_token, grant_type: "refresh_token" });
  await service.from("calendar_integrations").update({
    access_token: t.access_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  }).eq("profile_id", profileId);
  return { token: t.access_token, calendarId: integ.calendar_id as string, autoAdd: integ.auto_add as boolean };
}

/**
 * Creates, updates or removes the Google event linked to a booking so
 * reschedules and cancellations follow through. Best-effort: failures are
 * logged and never block the booking change itself.
 */
export async function syncBookingToCalendar(bookingId: string, opts: { explicit?: boolean } = {}) {
  if (!isCalendarConfigured()) return { synced: false, reason: "not_configured" as const };
  try {
    const service = await createServiceClient();
    const { data: b } = await service
      .from("bookings")
      .select("id, reference, kind, status, booker_id, scheduled_at, ends_at, pickup_address, collection_method, notes, provider:service_providers(name, address), service:provider_services(name)")
      .eq("id", bookingId)
      .single();
    if (!b) return { synced: false, reason: "not_found" as const };

    const auth = await accessTokenFor(b.booker_id);
    if (!auth) return { synced: false, reason: "not_connected" as const };

    const { data: link } = await service.from("calendar_event_links").select("google_event_id")
      .eq("booking_id", b.id).eq("profile_id", b.booker_id).maybeSingle();
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`;
    const headers = { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" };

    const shouldExist = CALENDAR_STATUSES.includes(b.status) && !!b.scheduled_at;
    if (!shouldExist) {
      if (link && ["cancelled", "declined"].includes(b.status)) {
        await fetch(`${base}/${link.google_event_id}`, { method: "DELETE", headers });
        await service.from("calendar_event_links").delete().eq("booking_id", b.id).eq("profile_id", b.booker_id);
      }
      return { synced: false, reason: "not_scheduled" as const };
    }
    if (!link && !auth.autoAdd && !opts.explicit) return { synced: false, reason: "auto_add_off" as const };

    const event = buildCalendarEvent(b as unknown as CalendarBooking, process.env.NEXT_PUBLIC_APP_URL ?? "");
    const res = link
      ? await fetch(`${base}/${link.google_event_id}`, { method: "PATCH", headers, body: JSON.stringify(event) })
      : await fetch(base, { method: "POST", headers, body: JSON.stringify(event) });
    if (!res.ok) return { synced: false, reason: "google_error" as const };
    const created = (await res.json()) as { id: string };
    await service.from("calendar_event_links").upsert({
      booking_id: b.id, profile_id: b.booker_id, google_event_id: created.id, synced_at: new Date().toISOString(),
    });
    return { synced: true as const };
  } catch (e) {
    console.error("calendar sync failed", e);
    return { synced: false, reason: "error" as const };
  }
}
