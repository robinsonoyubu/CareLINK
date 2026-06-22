import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    role: string;
    profession?: string;
    specialty?: string;
    years_of_experience?: number;
    bio?: string;
    org_name?: string;
    org_type?: string;
    registration_number?: string;
    website?: string;
    contact_person?: string;
  };

  const service = await createServiceClient();

  if (body.role === "professional") {
    const { error } = await service.from("professionals").upsert({
      profile_id: user.id,
      profession: (body.profession ?? "caregiver") as "nurse" | "nurse_assistant" | "caregiver" | "physiotherapist" | "doctor",
      specialty: body.specialty ?? null,
      years_of_experience: body.years_of_experience ?? 0,
      bio: body.bio ?? null,
    }, { onConflict: "profile_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.role === "organization") {
    const { error } = await service.from("organizations").upsert({
      profile_id: user.id,
      name: body.org_name ?? "My Organization",
      type: (body.org_type ?? "clinic") as "hospital" | "clinic" | "hmo" | "ngo" | "school" | "nursing_home",
      registration_number: body.registration_number ?? null,
      website: body.website ?? null,
      contact_person: body.contact_person ?? "",
    }, { onConflict: "profile_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.role === "client") {
    const { error } = await service.from("clients").upsert({
      profile_id: user.id,
    }, { onConflict: "profile_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
