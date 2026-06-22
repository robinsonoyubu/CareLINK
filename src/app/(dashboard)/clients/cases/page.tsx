import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Cases" };

export default async function ClientCasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "client" && profile?.role !== "admin") redirect("/dashboard");

  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).single();

  let query = supabase
    .from("assignments")
    .select("id, title, status, service_type, location, start_date, end_date, hourly_rate, description")
    .order("created_at", { ascending: false });

  if (client) query = query.eq("client_id", client.id);

  const { data: cases } = await query;

  const statusVariant: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
    pending: "pending", active: "active", completed: "completed", cancelled: "cancelled",
  };

  return (
    <div className="animate-fade-in">
      <Header title="My Cases" subtitle="Your active and past care assignments" />

      <div className="p-6 space-y-4">
        {cases && cases.length > 0 ? (
          cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] mb-1">{c.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[#64748B] mb-2">
                      <span className="capitalize">{c.service_type.replace(/_/g, " ")}</span>
                      {c.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{c.location}
                        </span>
                      )}
                      {c.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{formatDate(c.start_date)}
                          {c.end_date && ` – ${formatDate(c.end_date)}`}
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-[#94A3B8] line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant[c.status] ?? "default"} className="flex-shrink-0">{c.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No cases yet</h3>
            <p className="text-sm text-[#64748B]">Your care assignments will appear here once RAFFATI has deployed a professional.</p>
          </div>
        )}
      </div>
    </div>
  );
}
