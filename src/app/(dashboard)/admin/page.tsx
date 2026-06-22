import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, TrendingUp, Building2, BarChart2, UserPlus } from "lucide-react";
import Link from "next/link";
import { formatDate, humanizeStatus } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Panel" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [
    { count: totalProfessionals },
    { count: pendingAssignments },
    { count: activeAssignments },
    { count: totalOrganizations },
  ] = await Promise.all([
    supabase.from("professionals").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  const { data: rawRecentAssignments } = await supabase
    .from("assignments")
    .select("id, title, status, service_type, location, created_at, profiles!assigned_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(8);

  type AssignRow = {
    id: string; title: string; status: string; service_type: string;
    location: string; created_at: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
  };
  const recentAssignments = rawRecentAssignments as AssignRow[] | null;

  const { data: rawUnverified } = await supabase
    .from("professionals")
    .select("id, profession, profiles!inner(full_name)")
    .eq("is_verified", false)
    .order("created_at", { ascending: false })
    .limit(5);

  type UnverifiedRow = { id: string; profession: string; profiles: { full_name: string } | { full_name: string }[] };
  const unverified = rawUnverified as UnverifiedRow[] | null;

  const statusVariant: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
    pending: "pending", active: "active", completed: "completed", cancelled: "cancelled",
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Admin Panel"
        subtitle="Platform control and oversight"
        actions={
          <Link href="/professionals/new">
            <Button size="sm"><UserPlus className="h-4 w-4" /> Register Professional</Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Professionals" value={totalProfessionals ?? 0} icon={Users} iconColor="text-[#0F4C81]" iconBg="bg-[#EBF4FF]" />
          <StatsCard title="Pending Assignments" value={pendingAssignments ?? 0} icon={Briefcase} iconColor="text-[#F59E0B]" iconBg="bg-amber-50" changeType="neutral" />
          <StatsCard title="Active Assignments" value={activeAssignments ?? 0} icon={TrendingUp} iconColor="text-[#22C55E]" iconBg="bg-green-50" changeType="positive" />
          <StatsCard title="Organisations" value={totalOrganizations ?? 0} icon={Building2} iconColor="text-purple-600" iconBg="bg-purple-50" />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Workforce Hub", href: "/workforce", icon: Users, color: "text-[#0F4C81]", bg: "bg-[#EBF4FF]" },
            { label: "Analytics", href: "/admin/analytics", icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Assignments", href: "/assignments", icon: Briefcase, color: "text-[#F59E0B]", bg: "bg-amber-50" },
            { label: "Performance", href: "/performance", icon: TrendingUp, color: "text-[#22C55E]", bg: "bg-green-50" },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] p-4 hover:bg-[#F8FAFC] transition-colors text-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <span className="text-xs font-medium text-[#374151]">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Assignments */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Assignments</CardTitle>
              <Link href="/assignments" className="text-xs text-[#0F4C81] hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {(recentAssignments ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{a.title}</p>
                    <p className="text-xs text-[#94A3B8]">{a.location} · {formatDate(a.created_at)}</p>
                  </div>
                  <Badge variant={statusVariant[a.status] ?? "default"} className="flex-shrink-0">{a.status}</Badge>
                </div>
              ))}
              {(!recentAssignments || recentAssignments.length === 0) && (
                <p className="text-sm text-[#94A3B8] py-4 text-center">No assignments yet</p>
              )}
            </CardContent>
          </Card>

          {/* Unverified Professionals */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Verification</CardTitle>
              <Link href="/workforce" className="text-xs text-[#0F4C81] hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {(unverified ?? []).map((p) => {
                const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{prof.full_name}</p>
                      <p className="text-xs text-[#94A3B8] capitalize">{p.profession.replace(/_/g, " ")}</p>
                    </div>
                    <Badge variant="pending">Unverified</Badge>
                  </div>
                );
              })}
              {(!unverified || unverified.length === 0) && (
                <p className="text-sm text-[#94A3B8] py-4 text-center">All professionals verified</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
