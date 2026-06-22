import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const { name, email, phone, service, message } = parsed.data;

  const supabase = await createServiceClient();

  // Store in audit_logs as a contact enquiry (no dedicated table needed)
  await supabase.from("audit_logs").insert({
    action: "contact_form_submission",
    resource_type: "contact",
    new_values: { name, email, phone: phone ?? null, service: service ?? null, message },
  });

  return NextResponse.json({ ok: true });
}
