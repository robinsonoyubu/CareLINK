import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assignments" };

const statusColors: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
  active: "active",
  pending: "pending",
  completed: "completed",
  cancelled: "cancelled",
};

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileResult = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  const profile = profileResult.data as { id: string; role: string } | null;

  let query = supabase
    .from("assignments")
    .select(`
      id, title, service_type, duration_type, status, start_date, end_date,
      location, hourly_rate,
      professionals!inner(
        id,
        profiles!inner(full_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false });

  if (profile?.role === "professional") {
    const { data: proData } = await supabase.from("professionals").select("id").eq("profile_id", user.id).single();
    const pro = proData as { id: string } | null;
    if (pro) query = query.eq("professional_id", pro.id);
  }

  const { data: rawAssignments } = await query;
  type AssignmentRow = {
    id: string;
    title: string;
    service_type: string;
    duration_type: string;
    status: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    hourly_rate: number | null;
    professionals: { id: string; profiles: { full_name: string; avatar_url: string | null } | { full_name: string; avatar_url: string | null }[] } | null;
  };
  const assignments = rawAssignments as AssignmentRow[] | null;

  return (
    <div className="animate-fade-in">
      <Header
        title="Assignments"
        subtitle="Track all staff deployments"
        actions={
          profile?.role === "admin" ? (
            <Link href="/assignments/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New Assignment
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", "Active", "Pending", "Completed", "Cancelled"].map((f) => (
            <button
              key={f}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#E2E8F0] text-[#64748B] hover:border-[#0F4C81] hover:text-[#0F4C81] transition-colors"
            >
              {f}
            </button>
          ))}
        </div>

        {assignments && assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((a) => {
              const pro = Array.isArray(a.professionals) ? a.professionals[0] : a.professionals;
              const proProfile = pro ? (Array.isArray(pro.profiles) ? pro.profiles[0] : pro.profiles) : null;

              return (
                <Link key={a.id} href={`/assignments/${a.id}`}>
                  <Card className="hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">{a.title}</p>
                            <Badge variant={statusColors[a.status] ?? "default"} className="flex-shrink-0">
                              {a.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                            {proProfile && <span className="font-medium text-[#374151]">{proProfile.full_name}</span>}
                            <span className="capitalize">{a.service_type?.replace(/_/g, " ")}</span>
                            <span className="capitalize">{a.duration_type}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#94A3B8]">
                            {a.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{a.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{formatDate(a.start_date)}
                              {a.end_date && ` — ${formatDate(a.end_date)}`}
                            </span>
                          </div>
                        </div>
                        {a.hourly_rate && (
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-[#0F172A]">₦{a.hourly_rate.toLocaleString()}</p>
                            <p className="text-xs text-[#94A3B8]">per hour</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No assignments yet</h3>
            <p className="text-sm text-[#64748B]">Assignments will appear here once staff are deployed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
