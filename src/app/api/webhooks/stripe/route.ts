import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Signature verification requires Stripe SDK — skip if not configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    const stripe = (await import("stripe")).default;
    const client = new stripe(process.env.STRIPE_SECRET_KEY ?? "");
    event = client.webhooks.constructEvent(body, sig, webhookSecret) as typeof event;
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    await supabase.from("payments").update({ status: "completed", paid_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", pi["id"]);
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    await supabase.from("payments").update({ status: "failed" })
      .eq("stripe_payment_intent_id", pi["id"]);
  }

  return NextResponse.json({ received: true });
}
