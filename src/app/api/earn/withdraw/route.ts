import { NextResponse } from "next/server";
import { requireUser, badRequest, notify, rghAdminIds } from "@/lib/medlink/server";
import { makeReference } from "@/lib/medlink/bookings";

/** User confirmed the withdrawal to their verified OPay account. */
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const reference = makeReference("WDR");
  const { data, error } = await auth.supabase.rpc("request_withdrawal", { p_reference: reference });
  if (error) return badRequest(error.message, 409);

  await notify([auth.profile.id], {
    type: "earn", title: "Withdrawal processing",
    message: `${reference} is being processed. Target payout time is about one hour, subject to verification.`,
    link_url: "/earn/history",
  });
  await notify(await rghAdminIds(), { type: "earn", title: "Withdrawal to process", message: reference, link_url: "/admin/earn" });
  return NextResponse.json({ id: data, reference }, { status: 201 });
}
