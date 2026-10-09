import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";
import type { Json } from "@/types/database.types";

export type NotificationType =
  | "booking" | "payment" | "chat" | "result" | "prescription" | "order" | "dispatch"
  | "waitlist" | "earn" | "attendance" | "dispute" | "verification" | "system" | "alert" | "assignment";

/** Resolves the signed-in user + role, or a 401 response to return directly. */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 403 }) } as const;
  }
  return { supabase, user, profile: profile as { id: string; role: UserRole; full_name: string; email: string } } as const;
}

export function badRequest(error: unknown, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Writes to the central Notifications hub. Never throws — alerts must not break the main action. */
export async function notify(
  profileIds: (string | null | undefined)[],
  n: { type: NotificationType; title: string; message: string; link_url?: string; metadata?: Json }
) {
  const ids = [...new Set(profileIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return;
  try {
    const service = await createServiceClient();
    await service.from("notifications").insert(
      ids.map((profile_id) => ({
        profile_id,
        type: n.type,
        title: n.title,
        message: n.message,
        link_url: n.link_url ?? null,
        metadata: n.metadata ?? null,
      }))
    );
  } catch (e) {
    console.error("notify failed", e);
  }
}

export async function providerMemberIds(providerId: string | null | undefined): Promise<string[]> {
  if (!providerId) return [];
  const service = await createServiceClient();
  const { data } = await service.from("provider_members").select("profile_id").eq("provider_id", providerId);
  return (data ?? []).map((r: { profile_id: string }) => r.profile_id);
}

export async function rghAdminIds(): Promise<string[]> {
  const service = await createServiceClient();
  const { data } = await service.from("profiles").select("id").eq("role", "admin").eq("is_active", true);
  return (data ?? []).map((r: { id: string }) => r.id);
}

export async function isProviderMember(profileId: string, providerId: string | null | undefined) {
  if (!providerId) return false;
  const service = await createServiceClient();
  const { data } = await service
    .from("provider_members")
    .select("profile_id")
    .eq("provider_id", providerId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return !!data;
}
