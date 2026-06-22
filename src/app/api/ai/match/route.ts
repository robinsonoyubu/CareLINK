import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const client = new Anthropic();

const matchSchema = z.object({
  service_type: z.string(),
  duration_type: z.string(),
  location: z.string(),
  requirements: z.string(),
  specialty_needed: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: professionals } = await supabase
    .from("professionals")
    .select(`
      id, profession, specialty, years_of_experience, preferred_location,
      rating, total_assignments, availability,
      profiles!inner(full_name)
    `)
    .eq("workforce_status", "available")
    .eq("is_verified", true);

  if (!professionals?.length) {
    return NextResponse.json({ matches: [], message: "No available professionals found" });
  }

  const professionalsData = professionals.map((p) => {
    const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return {
      id: p.id,
      name: prof?.full_name,
      profession: p.profession,
      specialty: p.specialty,
      experience: p.years_of_experience,
      location: p.preferred_location,
      rating: p.rating,
      assignments: p.total_assignments,
      availability: p.availability,
    };
  });

  const prompt = `You are a healthcare staffing matching engine for RAFFATI Healthcare Agency in Nigeria.

Analyze the following job request and rank the available professionals:

REQUEST:
- Service Type: ${parsed.data.service_type}
- Duration: ${parsed.data.duration_type}
- Location: ${parsed.data.location}
- Requirements: ${parsed.data.requirements}
- Specialty Needed: ${parsed.data.specialty_needed || "Any"}

AVAILABLE PROFESSIONALS:
${JSON.stringify(professionalsData, null, 2)}

Return a JSON object with:
{
  "matches": [
    {
      "professional_id": "...",
      "name": "...",
      "match_score": 0-100,
      "match_reasons": ["reason1", "reason2"],
      "concerns": ["concern1"] or []
    }
  ],
  "recommendation": "brief overall recommendation"
}

Rank by: specialty match, experience, location preference, rating, availability. Return top 5 only.`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: prompt + "\n\nRespond with valid JSON only, no markdown code blocks.",
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "AI matching failed" }, { status: 500 });
  }

  try {
    const result = JSON.parse(textBlock.text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
