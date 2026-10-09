import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/medlink/server";
import { googleAuthUrl, isCalendarConfigured } from "@/lib/medlink/google-calendar";

/** Starts explicit Google Calendar authorization (Profile → Settings → Calendar Integration). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (!isCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar integration is not configured" }, { status: 503 });
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("gcal_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return NextResponse.redirect(googleAuthUrl(state));
}

/** Disconnect: removes stored tokens. Existing calendar events are left in the user's calendar. */
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { createServiceClient } = await import("@/lib/supabase/server");
  const service = await createServiceClient();
  await service.from("calendar_integrations").delete().eq("profile_id", auth.profile.id);
  await service.from("calendar_event_links").delete().eq("profile_id", auth.profile.id);
  return NextResponse.json({ ok: true });
}
