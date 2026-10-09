import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireUser, badRequest, notify } from "@/lib/medlink/server";

const schema = z.object({
  status: z.enum(["open", "under_review", "investigating", "awaiting_response", "resolved", "closed"]),
  resolution: z.string().max(4000).optional(),
  message: z.string().max(4000).optional(),
});

/** RGH moves a dispute through review → investigation → resolution → closure. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.profile.role !== "admin") return badRequest("Only RGH can update disputes", 403);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  if (["resolved", "closed"].includes(parsed.data.status) && !parsed.data.resolution) {
    const service = await createServiceClient();
    const { data: current } = await service.from("disputes").select("resolution").eq("id", id).single();
    if (!current?.resolution) return badRequest("Record a resolution before resolving or closing");
  }

  // Use the user's client so the status trigger records auth.uid() as the actor.
  const { data, error } = await auth.supabase.from("disputes").update({
    status: parsed.data.status,
    ...(parsed.data.resolution ? { resolution: parsed.data.resolution } : {}),
    assigned_to: auth.profile.id,
  }).eq("id", id).select("id, reference, opened_by, status").single();
  if (error || !data) return badRequest(error?.message ?? "Not found", 404);

  if (parsed.data.message) {
    await auth.supabase.from("dispute_events").insert({ dispute_id: id, actor_id: auth.profile.id, kind: "comment", body: parsed.data.message });
  }
  await notify([data.opened_by], {
    type: "dispute", title: `Dispute ${data.reference} updated`,
    message: `Status: ${data.status.replace(/_/g, " ")}${parsed.data.message ? ` — ${parsed.data.message}` : ""}`,
    link_url: `/disputes/${id}`,
  });
  return NextResponse.json(data);
}
