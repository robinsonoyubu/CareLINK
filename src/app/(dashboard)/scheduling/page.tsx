import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Scheduling" };

export default async function SchedulingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  let scheduleQuery = supabase
    .from("schedules")
    .select(`
      id, date, start_time, end_time, status, notes,
      assignments!inner(title, location, service_type),
      professionals!inner(
        profiles!inner(full_name)
      )
    `)
    .order("date", { ascending: true })
    .gte("date", new Date().toISOString().split("T")[0]);

  if (profile?.role === "professional") {
    const { data: pro } = await supabase.from("professionals").select("id").eq("profile_id", user.id).single();
    if (pro) scheduleQuery = scheduleQuery.eq("professional_id", pro.id);
  }

  const { data: rawSchedules } = await scheduleQuery.limit(50);

  type ScheduleRow = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    notes: string | null;
    assignments: { title: string; location: string; service_type: string } | null;
    professionals: { profiles: { full_name: string } | { full_name: string }[] } | null;
  };
  const schedules = rawSchedules as ScheduleRow[] | null;

  const grouped: Record<string, ScheduleRow[]> = {};
  for (const s of schedules ?? []) {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  }

  const statusVariant: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
    scheduled: "pending",
    completed: "completed",
    missed: "cancelled",
    cancelled: "cancelled",
  };

  return (
    <div className="animate-fade-in">
      <Header title="Scheduling" subtitle="Upcoming shifts and appointments" />

      <div className="p-6 space-y-6">
        {Object.keys(grouped).length > 0 ? (
          Object.entries(grouped).map(([date, daySchedules]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F4C81] text-white text-xs font-bold">
                  {new Date(date + "T00:00:00").getDate()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {new Date(date + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <p className="text-xs text-[#64748B]">{daySchedules.length} shift{daySchedules.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="ml-11 space-y-2">
                {daySchedules.map((s) => {
                  const proProfile = s.professionals
                    ? (Array.isArray(s.professionals.profiles) ? s.professionals.profiles[0] : s.professionals.profiles)
                    : null;
                  return (
                    <Card key={s.id} className="border-l-4 border-l-[#0F4C81]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] mb-1">
                              {s.assignments?.title ?? "Untitled Assignment"}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {s.start_time} — {s.end_time}
                              </span>
                              {s.assignments?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {s.assignments.location}
                                </span>
                              )}
                              {proProfile && (
                                <span className="font-medium text-[#374151]">{proProfile.full_name}</span>
                              )}
                            </div>
                            {s.notes && (
                              <p className="mt-1.5 text-xs text-[#94A3B8]">{s.notes}</p>
                            )}
                          </div>
                          <Badge variant={statusVariant[s.status] ?? "default"} className="flex-shrink-0">
                            {s.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No upcoming shifts</h3>
            <p className="text-sm text-[#64748B]">Scheduled shifts will appear here once assignments are created.</p>
          </div>
        )}
      </div>
    </div>
  );
}
