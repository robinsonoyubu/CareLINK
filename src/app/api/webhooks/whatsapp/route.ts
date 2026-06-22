import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "raffati_wh";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return NextResponse.json({ status: "ok" });

    const from = message.from as string;
    const text = message.text?.body as string | undefined;
    const messageId = message.id as string;

    if (!text) return NextResponse.json({ status: "ok" });

    const supabase = createServiceClient();

    // Log incoming message for admin review
    await supabase.from("audit_logs").insert({
      action: "whatsapp_message_received",
      table_name: "messages",
      new_data: { from, text, message_id: messageId },
    });

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
