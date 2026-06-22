import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";

  const hash = createHmac("sha512", secret).update(body).digest("hex");
  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as { event: string; data: Record<string, unknown> };
  const supabase = createServiceClient();

  if (event.event === "charge.success") {
    const ref = event.data["reference"] as string;
    const amount = (event.data["amount"] as number) / 100;

    await supabase.from("payments").update({
      status: "completed",
      paid_at: new Date().toISOString(),
      amount,
    }).eq("paystack_reference", ref);
  } else if (event.event === "charge.failed") {
    const ref = event.data["reference"] as string;
    await supabase.from("payments").update({ status: "failed" })
      .eq("paystack_reference", ref);
  }

  return NextResponse.json({ status: "ok" });
}
