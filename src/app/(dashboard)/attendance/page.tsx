import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffShifts } from "@/components/attendance/staff-shifts";
import { formatDateTime, isoFromNow } from "@/lib/utils";

export const metadata = { title: "My Attendance" };

export default async function MyAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: pro } = await supabase.from("professionals").select("id").eq("profile_id", user.id).maybeSingle();
  if (!pro) redirect("/dashboard");

  const from = isoFromNow(-24 * 3600 * 1000);
  const to = isoFromNow(14 * 24 * 3600 * 1000);
  const [{ data: shifts }, { data: events }, { data: consents }] = await Promise.all([
    supabase.from("shifts").select("id, starts_at, ends_at, status, duration_minutes, has_exceptions, site:facility_sites(name), org:organizations(name)")
      .eq("professional_id", pro.id).or(`status.eq.in_progress,and(starts_at.gte.${from},starts_at.lte.${to})`).order("starts_at"),
    supabase.from("attendance_events").select("id, event_type, server_ts, outcome, rejection_reasons, exception_reason")
      .eq("professional_id", pro.id).order("server_ts", { ascending: false }).limit(20),
    supabase.from("privacy_consents").select("consent, granted").eq("profile_id", user.id).in("consent", ["facial_verification", "precise_location"]),
  ]);
  const consented = (consents ?? []).filter((c) => c.granted).length === 2;
  const rows = (shifts ?? []).map((s) => {
    const r = s as unknown as { id: string; starts_at: string; ends_at: string; status: string; duration_minutes: number | null; has_exceptions: boolean; site: { name: string } | null; org: { name: string } | null };
    return { ...r, site_name: r.site?.name ?? "Site", org_name: r.org?.name ?? "Facility" };
  });

  return (
    <div className="animate-fade-in">
      <Header title="My Attendance" subtitle="Clock in and out with dynamic QR, geofence and face verification" />
      <div className="p-4 md:p-6 space-y-5 max-w-3xl">
        <StaffShifts shifts={rows} consented={consented} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent attempts</CardTitle></CardHeader>
          <CardContent>
            {(events ?? []).length === 0 ? <p className="text-sm text-[#64748B]">No attendance events yet.</p> : (
              <ul className="divide-y divide-[#F1F5F9] text-sm">
                {(events ?? []).map((e) => (
                  <li key={e.id} className="py-2 flex justify-between gap-3">
                    <span>{e.event_type === "clock_in" ? "Clock in" : "Clock out"} · {formatDateTime(e.server_ts)}
                      {e.rejection_reasons?.length > 0 && <span className="block text-xs text-red-700">{e.rejection_reasons.join(", ").replace(/_/g, " ")}</span>}
                      {e.exception_reason && <span className="block text-xs text-amber-700">Manual exception: {e.exception_reason.replace(/_/g, " ")}</span>}
                    </span>
                    <span className={e.outcome === "accepted" ? "text-green-700" : e.outcome === "rejected" ? "text-red-700" : "text-amber-700"}>{e.outcome.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
