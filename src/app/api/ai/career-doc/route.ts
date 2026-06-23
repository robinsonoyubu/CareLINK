import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { careerDocSchema } from "@/validations";

const client = new Anthropic();

const systemPrompt = `You are an expert healthcare career coach and professional writer specializing in Nigerian and international (including NHS UK) healthcare recruitment.
You produce polished, ATS-friendly, professionally formatted documents and coaching material.
Format all output as clean, well-structured markdown that can be converted to PDF/DOCX.
Be specific to the healthcare profession provided and grounded in real clinical competencies.`;

const docInstructions: Record<string, (ctx: string) => string> = {
  cover_letter: (ctx) => `Write a compelling, tailored cover letter for this healthcare role.\n${ctx}\n
Structure: greeting, strong opening hook, 2-3 body paragraphs mapping the candidate's experience to the role requirements, and a confident closing with a call to action. Keep it to one page.`,

  nhs_statement: (ctx) => `Write an NHS supporting statement following NHS application guidelines and the NHS competency framework.\n${ctx}\n
Address the person specification criteria explicitly, demonstrate the NHS values (working together for patients, respect and dignity, commitment to quality of care, compassion, improving lives, everyone counts), and use the STAR method (Situation, Task, Action, Result) for key examples.`,

  interview_prep: (ctx) => `Create a comprehensive interview preparation guide for this healthcare role.\n${ctx}\n
Include: 8-10 likely interview questions (mix of clinical, behavioural, and scenario-based), a model answer for each using the STAR method where relevant, key clinical topics to revise, and 5 strong questions the candidate should ask the interviewer.`,

  career_guidance: (ctx) => `Create a personalised healthcare career roadmap and guidance plan.\n${ctx}\n
Include: an assessment of the current position, 2-3 realistic career pathways with required qualifications/certifications and typical timelines, recommended next steps for the next 6-12 months, and continuing professional development (CPD) suggestions relevant to the Nigerian and international healthcare sectors.`,

  recommendation_letter: (ctx) => `Write a professional recommendation/reference letter for this healthcare professional.\n${ctx}\n
Write from the perspective of the supervisor described. Include: relationship and duration, specific strengths and clinical competencies with concrete examples, professionalism and patient-care qualities, and a strong overall endorsement. Keep a formal, credible tone.`,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = careerDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { doc_type, profession, full_name, years_of_experience, specialty, details } = parsed.data;

  const context = `- Name: ${full_name}
- Profession: ${profession.replace(/_/g, " ")}
- Specialty: ${specialty || "General"}
- Years of Experience: ${years_of_experience ?? "Not specified"}
- Additional details / role description / goals:
${details}`;

  const userPrompt = docInstructions[doc_type](context);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const response = await client.messages.stream({
        model: "claude-opus-4-8",
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      for await (const chunk of response) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
