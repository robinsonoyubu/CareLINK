import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { DISPUTE_CATEGORIES, disputeTone } from "@/lib/medlink/disputes";

export const metadata = { title: "Dispute Centre" };

export default async function DisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("disputes")
    .select("id, reference, category, subject, status, created_at, updated_at")
    .order("updated_at", { ascending: false }).limit(100);
  const disputes = data ?? [];

  return (
    <div className="animate-fade-in">
      <Header title="Dispute Centre" subtitle="Payment, provider, order, diagnostic, appointment and ambulance complaints"
        actions={<Link href="/disputes/new"><Button size="sm"><Plus className="h-4 w-4" />Open dispute</Button></Link>} />
      <div className="p-4 md:p-6 space-y-3 max-w-4xl">
        <p className="text-xs text-[#64748B]">Open Dispute → Reference → Linked booking → Evidence → RGH Review → Investigation → Resolution → Closure</p>
        {disputes.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Scale className="h-10 w-10 text-[#CBD5E1] mb-3" />
            <p className="text-sm text-[#64748B]">No disputes. If something went wrong with a booking, open one here.</p>
          </div>
        ) : disputes.map((d) => (
          <Link key={d.id} href={`/disputes/${d.id}`} className="block">
            <Card className="hover:shadow-md transition"><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">{d.reference} · {DISPUTE_CATEGORIES[d.category]}</p>
                <p className="font-medium truncate">{d.subject}</p>
                <p className="text-xs text-[#94A3B8]">Updated {formatDateTime(d.updated_at)}</p>
              </div>
              <Badge variant={disputeTone(d.status)}>{d.status.replace(/_/g, " ")}</Badge>
            </CardContent></Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
