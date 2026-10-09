import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/medlink/server";
import { emailFromIdToken, exchangeCode } from "@/lib/medlink/google-calendar";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/profile?tab=calendar&${q}`, url.origin));

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const jar = await cookies();
  const expected = jar.get("gcal_state")?.value;
  jar.delete("gcal_state");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back("calendar=denied");

  try {
    const t = await exchangeCode(code);
    const service = await createServiceClient();
    await service.from("calendar_integrations").upsert({
      profile_id: auth.profile.id,
      provider: "google",
      google_email: emailFromIdToken(t.id_token),
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    });
    await service.from("privacy_consents").upsert({ profile_id: auth.profile.id, consent: "calendar_sync", granted: true, updated_at: new Date().toISOString() });
    return back("calendar=connected");
  } catch {
    return back("calendar=error");
  }
}
