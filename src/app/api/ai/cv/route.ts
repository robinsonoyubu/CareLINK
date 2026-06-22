import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { cvGeneratorSchema } from "@/validations";

const client = new Anthropic();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = cvGeneratorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { profession, template, full_name, years_of_experience, specialty, skills, education, certifications, professional_summary } = parsed.data;

  const templateInstructions: Record<string, string> = {
    standard: "Nigerian healthcare standard CV format",
    international: "International healthcare CV format suitable for global applications",
    nhs_uk: "NHS UK application format following NHS guidelines and competency frameworks",
  };

  const systemPrompt = `You are an expert healthcare CV writer specializing in Nigerian and international healthcare recruitment.
Generate professional, ATS-optimized CVs that highlight clinical competencies, patient care achievements, and professional development.
Format the output as clean, well-structured markdown that can be converted to PDF/DOCX.`;

  const userPrompt = `Generate a professional CV for:
- Name: ${full_name}
- Profession: ${profession.replace(/_/g, " ")}
- Specialty: ${specialty || "General"}
- Years of Experience: ${years_of_experience}
- Template: ${templateInstructions[template]}
- Key Skills: ${skills.join(", ")}
- Education: ${education}
- Certifications: ${certifications || "Not specified"}
- Professional Summary provided: ${professional_summary || "Generate an appropriate summary"}

Create a complete, professional CV including:
1. Personal statement / professional summary (3-4 impactful sentences)
2. Core competencies and clinical skills
3. Professional experience section (use placeholder for specific employers)
4. Education and qualifications
5. Certifications and licenses
6. Professional memberships
7. References (available upon request)

Make it compelling, specific to the profession, and optimized for Nigerian healthcare sector unless international template is specified.`;

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
