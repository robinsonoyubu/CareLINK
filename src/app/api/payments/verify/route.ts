import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${paystackSecret}` },
  });

  type PaystackVerify = { status: boolean; data?: { status: string; amount: number; metadata?: { assignment_id?: string } } };
  const body = await res.json() as PaystackVerify;

  if (!body.status || body.data?.status !== "success") {
    return NextResponse.json({ ok: false, error: "Payment not successful" });
  }

  const service = await createServiceClient();
  const amount = (body.data.amount ?? 0) / 100;

  // Mark the matching pending payment as paid
  await service
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("provider_reference", reference)
    .eq("status", "pending");

  return NextResponse.json({ ok: true, amount });
}
