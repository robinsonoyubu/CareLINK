import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";

const schema = z.object({
  kind: z.enum(["hospital", "diagnostic", "pharmacy", "ambulance"]),
  name: z.string().min(2).max(150),
  address: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  owner_email: z.string().email().optional().or(z.literal("")),
  is_emergency_partner: z.boolean().default(false),
});

/** RGH onboards a provider and links a staff account as its owner. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.profile.role !== "admin") return badRequest("Forbidden", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { owner_email, ...d } = parsed.data;

  const service = await createServiceClient();
  let owner: { id: string; role: string } | null = null;
  if (owner_email) {
    const { data } = await service.from("profiles").select("id, role").eq("email", owner_email.toLowerCase()).maybeSingle();
    if (!data) return badRequest("No MedLINK account uses that email", 404);
    if (data.role === "admin" || data.role === "professional") return badRequest("That account is an RGH or professional account; use a dedicated provider account", 409);
    owner = data;
  }

  const { data: provider, error } = await service.from("service_providers").insert({
    ...d, address: d.address || null, city: d.city || null, state: d.state || null, phone: d.phone || null,
    is_emergency_partner: d.kind === "ambulance" && d.is_emergency_partner,
  }).select("id").single();
  if (error) return badRequest(error.message, 500);

  if (owner) {
    await service.from("provider_members").insert({ provider_id: provider.id, profile_id: owner.id, member_role: "owner" });
    if (owner.role !== "provider") await service.from("profiles").update({ role: "provider" }).eq("id", owner.id);
    await notify([owner.id], { type: "system", title: "Provider Portal ready", message: `You can now manage ${d.name} in MedLINK.`, link_url: "/provider" });
  }
  await service.from("audit_logs").insert({ user_id: auth.profile.id, action: "create_provider", resource_type: "service_provider", resource_id: provider.id, new_values: d });
  return NextResponse.json({ id: provider.id }, { status: 201 });
}
