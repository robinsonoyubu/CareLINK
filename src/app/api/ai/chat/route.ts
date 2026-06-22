import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const client = new Anthropic();

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  context: z.enum(["general", "cv", "performance", "scheduling"]).default("general"),
});

const systemPrompts: Record<string, string> = {
  general: `You are a helpful AI assistant for careLINK by RAFFATI, Nigeria's premier healthcare workforce management platform.
You help healthcare professionals, clients, and organizations with questions about staffing, care services, and platform features.
Be professional, empathetic, and knowledgeable about Nigerian healthcare standards.`,

  cv: `You are a professional CV and career coach specializing in Nigerian and international healthcare careers.
Help users craft compelling CVs, cover letters, and professional statements that stand out in the healthcare sector.`,

  performance: `You are a healthcare performance management specialist.
Help supervisors and managers understand performance metrics, create development plans, and interpret scorecard results.`,

  scheduling: `You are a scheduling and workforce planning specialist for healthcare.
Help with shift scheduling, availability management, and optimizing staff deployment for patient care needs.`,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { messages, context } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await client.messages.stream({
        model: "claude-opus-4-8",
        max_tokens: 2048,
        thinking: { type: "adaptive" },
        system: systemPrompts[context],
        messages,
      });

      for await (const chunk of response) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
