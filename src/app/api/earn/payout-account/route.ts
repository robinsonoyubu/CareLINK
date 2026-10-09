import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";

const saveSchema = z.object({
  account_name: z.string().min(3).max(120),
  account_number: z.string().regex(/^\d{10}$/, "OPay account numbers are 10 digits"),
});

/** Save (or change) the OPay payout account. Any change requires re-verification by RGH. */
export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  const { error } = await service.from("payout_accounts").upsert({
    profile_id: auth.profile.id,
    provider: "opay",
    account_name: parsed.data.account_name,
    account_number: parsed.data.account_number,
    is_verified: false,
    verified_at: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return badRequest(error.message, 500);
  return NextResponse.json({ ok: true });
}

const verifySchema = z.object({ profile_id: z.string().uuid(), verified: z.boolean() });

/** RGH confirms the account name matches the OPay account. */
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.profile.role !== "admin") return badRequest("Forbidden", 403);
  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  await service.from("payout_accounts").update({
    is_verified: parsed.data.verified, verified_at: parsed.data.verified ? new Date().toISOString() : null,
  }).eq("profile_id", parsed.data.profile_id);
  await notify([parsed.data.profile_id], {
    type: "earn",
    title: parsed.data.verified ? "OPay account verified" : "OPay account needs attention",
    message: parsed.data.verified ? "You can now withdraw once you reach 100 coins." : "Please check your OPay account details.",
    link_url: "/earn",
  });
  return NextResponse.json({ ok: true });
}
