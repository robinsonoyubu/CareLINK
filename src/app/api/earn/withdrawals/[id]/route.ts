import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";

const schema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("successful") }),
  z.object({ status: z.literal("failed"), reason: z.string().min(3).max(300) }),
]);

/** RGH marks an OPay payout as paid, or failed (coins are returned to the wallet). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.profile.role !== "admin") return badRequest("Forbidden", 403);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const service = await createServiceClient();
  const { data: w } = await service.from("withdrawals").select("*").eq("id", id).single();
  if (!w) return badRequest("Not found", 404);
  if (w.status !== "processing") return badRequest("Already finalised", 409);

  const now = new Date().toISOString();
  if (parsed.data.status === "successful") {
    await service.from("withdrawals").update({ status: "successful", processed_at: now, processed_by: auth.profile.id }).eq("id", id);
    await notify([w.profile_id], {
      type: "earn", title: "Payout successful",
      message: `${w.reference}: ₦${Number(w.amount).toLocaleString("en-NG")} sent to ${w.account_name} (${w.account_masked}).`,
      link_url: "/earn/history",
    });
  } else {
    await service.from("withdrawals").update({
      status: "failed", processed_at: now, processed_by: auth.profile.id, failure_reason: parsed.data.reason,
    }).eq("id", id);
    const { data: wallet } = await service.from("coin_wallets").select("balance").eq("profile_id", w.profile_id).single();
    await service.from("coin_ledger").insert({ profile_id: w.profile_id, delta: w.coins, reason: "withdrawal_reversal", withdrawal_id: id });
    await service.from("coin_wallets").update({ balance: (wallet?.balance ?? 0) + w.coins, updated_at: now }).eq("profile_id", w.profile_id);
    await notify([w.profile_id], {
      type: "earn", title: "Payout failed",
      message: `${w.reference}: ${parsed.data.reason}. Your ${w.coins} coins have been returned to your wallet.`,
      link_url: "/earn/history",
    });
  }
  return NextResponse.json({ ok: true });
}
