import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  assignment_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(["stripe", "paystack"]),
  currency: z.string().default("NGN"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { assignment_id, amount, payment_method, currency } = parsed.data;

  // Verify the assignment belongs to a client or org the user is linked to
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title")
    .eq("id", assignment_id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const service = await createServiceClient();

  if (payment_method === "paystack") {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: "Paystack not configured" }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: profile?.email ?? user.email,
        amount: Math.round(amount * 100), // kobo
        currency,
        metadata: { assignment_id, user_id: user.id },
      }),
    });

    const paystackData = await res.json() as { status: boolean; data?: { reference: string; authorization_url: string } };
    if (!paystackData.status || !paystackData.data) {
      return NextResponse.json({ error: "Failed to initialize Paystack payment" }, { status: 500 });
    }

    // Record pending payment
    await service.from("payments").insert({
      assignment_id,
      payer_id: user.id,
      amount,
      currency,
      payment_method: "paystack",
      status: "pending",
      provider_reference: paystackData.data.reference,
    });

    return NextResponse.json({ authorization_url: paystackData.data.authorization_url, reference: paystackData.data.reference });
  }

  if (payment_method === "stripe") {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const stripe = (await import("stripe")).default;
    const client = new stripe(stripeSecret);

    const paymentIntent = await client.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: currency.toLowerCase(),
      metadata: { assignment_id, user_id: user.id },
      description: `careLINK: ${assignment.title}`,
    });

    // Record pending payment
    await service.from("payments").insert({
      assignment_id,
      payer_id: user.id,
      amount,
      currency,
      payment_method: "stripe",
      status: "pending",
      provider_reference: paymentIntent.id,
    });

    return NextResponse.json({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id });
  }

  return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
}
