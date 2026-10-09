import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUser, badRequest } from "@/lib/medlink/server";

const client = new Anthropic();
const MAX_TOOL_ROUNDS = 6;

const SYSTEM = `You are the MedLINK AI Health Assistant (MedLINK by RGH, Nigeria).

What you do:
- Give clear, general health information in plain language.
- Help people find and book the right service: Hospitals, Diagnostics, Pharmacy, Ambulance & Paramedics, or RGH-verified professional care (nurses, caregivers, physiotherapists, doctors).
- Booking help: understand the need → identify the service → use the tools to show real options → collect the key details → give the booking link so the person confirms it themselves → explain any bank-transfer payment step → point them to My Bookings.

Hard limits:
- You are not a doctor. Never state a diagnosis as certain; describe possibilities and when to seek care.
- Never prescribe or recommend doses of prescription-only medicines. For those, a doctor's prescription is required; a pharmacist can advise on availability and over-the-counter options.
- If anything suggests an emergency (e.g. chest pain, trouble breathing, heavy bleeding, unconsciousness, seizures, stroke signs, severe injury, labour complications, suicidal thoughts), say so first and tell them to use MedLINK Emergency at /ambulance or call 112 now. Do not delay this with questions.
- Only offer providers and services returned by your tools. Never invent names, prices or availability.
- You cannot complete bookings or payments yourself: give the link and let the person confirm.

Style: warm, concise, practical. Use short paragraphs or bullet lists. Links are app paths like /hospitals/<id>.`;

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_services",
    description: "Search MedLINK's active providers and their bookable services. Use before suggesting any provider. Returns providers with ids, location, verification, rating and matching services with prices.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["hospital", "diagnostic", "pharmacy", "ambulance"], description: "Type of provider." },
        query: { type: "string", description: "What the person needs, e.g. 'malaria test', 'paediatrics', 'amoxicillin'. Optional." },
        city: { type: "string", description: "City or area to filter by, e.g. 'Ikeja'. Optional." },
      },
      required: ["kind"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "get_my_bookings",
    description: "List the signed-in person's recent MedLINK bookings with status and payment state.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "booking_link",
    description: "Build the link that opens the booking form pre-filled for a chosen provider/service, or the professional-care request form. The person confirms the booking there.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["hospital", "diagnostic", "pharmacy", "ambulance", "professional_care"] },
        provider_id: { type: "string", description: "Provider id from search_services. Not needed for professional_care." },
        service_id: { type: "string", description: "Service/test id from search_services, if one was chosen." },
      },
      required: ["kind"],
      additionalProperties: false,
    },
  },
];

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) })).min(1).max(40),
});

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { supabase, profile } = auth;

  async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
    if (name === "search_services") {
      const kind = String(input.kind);
      const term = typeof input.query === "string" ? input.query.replace(/[%,()]/g, "").trim() : "";
      const city = typeof input.city === "string" ? input.city.replace(/[%,()]/g, "").trim() : "";
      let q = supabase.from("service_providers").select("id, name, city, address, is_verified, rating_avg, rating_count, offers_home_collection, is_emergency_partner")
        .eq("kind", kind).eq("is_active", true).limit(8);
      if (city) q = q.ilike("city", `%${city}%`);
      const { data: providers } = await q;
      const ids = (providers ?? []).map((p) => p.id);
      let sq = supabase.from("provider_services").select("id, provider_id, name, price, requires_prescription, home_collection, in_stock, is_available")
        .in("provider_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).eq("is_active", true).limit(40);
      if (term) sq = sq.ilike("name", `%${term}%`);
      const { data: services } = await sq;
      return JSON.stringify((providers ?? []).map((p) => ({
        ...p, services: (services ?? []).filter((s) => s.provider_id === p.id).map((s) => ({ id: s.id, name: s.name, price: s.price, requires_prescription: s.requires_prescription, home_collection: s.home_collection, in_stock: s.in_stock, is_available: s.is_available })),
      })).filter((p) => !term || p.services.length > 0 || p.name.toLowerCase().includes(term.toLowerCase())));
    }
    if (name === "get_my_bookings") {
      const { data } = await supabase.from("bookings").select("id, reference, kind, status, payment_status, scheduled_at, amount")
        .eq("booker_id", profile.id).order("created_at", { ascending: false }).limit(10);
      return JSON.stringify((data ?? []).map((b) => ({ ...b, link: `/bookings/${b.id}` })));
    }
    if (name === "booking_link") {
      const kind = String(input.kind);
      if (kind === "professional_care") return JSON.stringify({ link: "/bookings/new" });
      const pid = String(input.provider_id ?? "");
      if (!UUID.test(pid)) return JSON.stringify({ error: "provider_id from search_services is required" });
      const base = { hospital: "/hospitals", diagnostic: "/diagnostics", pharmacy: "/pharmacy", ambulance: "/ambulance" }[kind];
      const sid = typeof input.service_id === "string" && UUID.test(input.service_id) ? input.service_id : null;
      const param = kind === "diagnostic" ? "test" : "service";
      return JSON.stringify({ link: `${base}/${pid}${sid && (kind === "hospital" || kind === "diagnostic") ? `?${param}=${sid}` : ""}` });
    }
    return JSON.stringify({ error: `Unknown tool ${name}` });
  }

  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }));

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // Refusal fallback: a policy decline is retried server-side on the fallback model.
      const response = await client.beta.messages.create({
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: "claude-opus-4-8" }],
        model: "claude-opus-5-5",
        max_tokens: 4000,
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools,
        messages,
      });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({ reply: "I can't help with that here. For urgent health concerns use Emergency (/ambulance) or call 112; otherwise a doctor or pharmacist on MedLINK can help." });
      }
      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const reply = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        return NextResponse.json({ reply: reply || "Sorry, I couldn't put an answer together. Please try rephrasing." });
      }

      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(toolUses.map(async (t) => {
        try {
          return { type: "tool_result" as const, tool_use_id: t.id, content: await runTool(t.name, t.input as Record<string, unknown>) };
        } catch {
          return { type: "tool_result" as const, tool_use_id: t.id, content: "Lookup failed", is_error: true };
        }
      }));
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({ reply: "That took too many steps. Could you tell me a bit more specifically what you need?" });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return badRequest("The assistant is busy. Please try again in a moment.", 429);
    if (error instanceof Anthropic.APIError) return badRequest("The assistant is unavailable right now.", 502);
    throw error;
  }
}
