import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileLink } from "@/components/medlink/file-upload";
import { DisputeReply, DisputeAdminControls } from "@/components/medlink/dispute-controls";
import { formatDateTime } from "@/lib/utils";
import { DISPUTE_CATEGORIES, disputeTone } from "@/lib/medlink/disputes";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: d } = await supabase.from("disputes").select("*").eq("id", id).maybeSingle();
  if (!d) notFound();
  const [{ data: events }, { data: profile }, { data: booking }] = await Promise.all([
    supabase.from("dispute_events").select("*").eq("dispute_id", id).order("created_at"),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    d.booking_id ? supabase.from("bookings").select("id, reference").eq("id", d.booking_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const isAdmin = profile?.role === "admin";
  const closed = d.status === "closed";

  return (
    <div className="animate-fade-in">
      <Header title={d.reference} subtitle={DISPUTE_CATEGORIES[d.category]} />
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <Link href="/disputes" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />Dispute Centre</Link>
        <Card><CardContent className="p-5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold">{d.subject}</p>
            <Badge variant={disputeTone(d.status)}>{d.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap text-[#374151]">{d.description}</p>
          <p className="text-xs text-[#94A3B8]">Opened {formatDateTime(d.created_at)}{booking && <> · Linked booking <Link className="text-[#0F4C81] hover:underline" href={`/bookings/${booking.id}`}>{booking.reference}</Link></>}</p>
          {d.resolution && <div className="rounded-md bg-green-50 p-3 text-sm text-green-900"><strong>Resolution:</strong> {d.resolution}</div>}
        </CardContent></Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-36 flex-shrink-0 text-xs text-[#94A3B8]">{formatDateTime(e.created_at)}</span>
                  <span>
                    {e.kind === "status_change" && <>Status changed to <strong>{String(e.to_status).replace(/_/g, " ")}</strong></>}
                    {e.kind === "comment" && <span className="whitespace-pre-wrap">{e.actor_id === user.id ? "You: " : e.actor_id === d.opened_by ? "Complainant: " : "RGH / provider: "}{e.body}</span>}
                    {e.kind === "evidence" && <>Evidence added — <FileLink path={e.evidence_url} label="view file" /></>}
                  </span>
                </li>
              ))}
              {(events ?? []).length === 0 && <li className="text-[#64748B]">Waiting for RGH review.</li>}
            </ol>
          </CardContent>
        </Card>

        {!closed && <DisputeReply disputeId={id} />}
        {isAdmin && <DisputeAdminControls disputeId={id} status={d.status} resolution={d.resolution} />}
      </div>
    </div>
  );
}
