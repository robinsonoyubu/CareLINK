import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Users, Briefcase, TrendingUp, DollarSign, UserCheck, Building2 } from "lucide-react";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [
    { count: totalProfessionals },
    { count: availableProfessionals },
    { count: activeAssignments },
    { count: completedAssignments },
    { count: totalClients },
    { count: totalOrganizations },
  ] = await Promise.all([
    supabase.from("professionals").select("id", { count: "exact", head: true }),
    supabase.from("professionals").select("id", { count: "exact", head: true }).eq("workforce_status", "available"),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  const { data: workforceStatus } = await supabase
    .from("professionals")
    .select("workforce_status");

  const statusCounts = (workforceStatus ?? []).reduce((acc: Record<string, number>, p) => {
    acc[p.workforce_status] = (acc[p.workforce_status] ?? 0) + 1;
    return acc;
  }, {});

  const { data: professionData } = await supabase
    .from("professionals")
    .select("profession");

  const professionCounts = (professionData ?? []).reduce((acc: Record<string, number>, p) => {
    acc[p.profession] = (acc[p.profession] ?? 0) + 1;
    return acc;
  }, {});

  const { data: recentScorecards } = await supabase
    .from("scorecards")
    .select("period_month, period_year, overall_score")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(12);

  const chartData = {
    workforceStatus: Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    })),
    professions: Object.entries(professionCounts).map(([name, value]) => ({
      name: name.replace(/_/g, " "),
      value,
    })),
    scorecardTrend: (recentScorecards ?? []).reverse().map((s) => ({
      period: `${s.period_month}/${s.period_year}`,
      score: parseFloat(s.overall_score.toFixed(1)),
    })),
  };

  return (
    <div className="animate-fade-in">
      <Header title="Analytics" subtitle="Platform performance overview" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Total Professionals"
            value={totalProfessionals ?? 0}
            change={`${availableProfessionals ?? 0} available`}
            changeType="positive"
            icon={Users}
            iconColor="text-[#0F4C81]"
            iconBg="bg-[#EBF4FF]"
          />
          <StatsCard
            title="Active Assignments"
            value={activeAssignments ?? 0}
            change={`${completedAssignments ?? 0} completed total`}
            changeType="neutral"
            icon={Briefcase}
            iconColor="text-[#F59E0B]"
            iconBg="bg-amber-50"
          />
          <StatsCard
            title="Clients"
            value={totalClients ?? 0}
            change={`${totalOrganizations ?? 0} organizations`}
            changeType="neutral"
            icon={Building2}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
        </div>

        <AnalyticsCharts data={chartData} />
      </div>
    </div>
  );
}
