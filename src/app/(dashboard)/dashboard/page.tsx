import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Briefcase, Heart, Building2, TrendingUp, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const role = profile.role;

  let stats = { professionals: 0, available: 0, assignments: 0, clients: 0, organizations: 0 };

  if (role === "admin") {
    const [professionals, available, assignments, clients, organizations] = await Promise.all([
      supabase.from("professionals").select("id", { count: "exact", head: true }),
      supabase.from("professionals").select("id", { count: "exact", head: true }).eq("workforce_status", "available"),
      supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("organizations").select("id", { count: "exact", head: true }),
    ]);
    stats = {
      professionals: professionals.count ?? 0,
      available: available.count ?? 0,
      assignments: assignments.count ?? 0,
      clients: clients.count ?? 0,
      organizations: organizations.count ?? 0,
    };
  }

  const { data: recentAssignments } = await supabase
    .from("assignments")
    .select("id, title, status, start_date, service_type")
    .order("created_at", { ascending: false })
    .limit(5);

  const greeting = getGreeting();
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="animate-fade-in">
      <Header
        title={`${greeting}, ${firstName} 👋`}
        subtitle={`${formatDate(new Date())} · ${humanizeRole(role)}`}
      />

      <div className="p-6 space-y-6">
        {role === "admin" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Professionals"
              value={stats.professionals}
              change="Healthcare workforce"
              changeType="neutral"
              icon={Users}
              iconColor="text-[#0F4C81]"
              iconBg="bg-[#EBF4FF]"
            />
            <StatsCard
              title="Available Now"
              value={stats.available}
              change={`of ${stats.professionals} professionals`}
              changeType="positive"
              icon={UserCheck}
              iconColor="text-[#22C55E]"
              iconBg="bg-green-50"
            />
            <StatsCard
              title="Active Assignments"
              value={stats.assignments}
              change="Currently deployed"
              changeType="neutral"
              icon={Briefcase}
              iconColor="text-[#F59E0B]"
              iconBg="bg-amber-50"
            />
            <StatsCard
              title="Clients & Orgs"
              value={stats.clients + stats.organizations}
              change={`${stats.clients} clients · ${stats.organizations} orgs`}
              changeType="neutral"
              icon={Building2}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
          </div>
        )}

        {role === "professional" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="My Assignments" value="—" icon={Briefcase} iconColor="text-[#0F4C81]" iconBg="bg-[#EBF4FF]" description="Total career assignments" />
            <StatsCard title="Current Status" value="Available" icon={UserCheck} iconColor="text-[#22C55E]" iconBg="bg-green-50" description="Ready for deployment" />
            <StatsCard title="Performance Score" value="—" icon={TrendingUp} iconColor="text-[#F59E0B]" iconBg="bg-amber-50" description="Average monthly score" />
          </div>
        )}

        {role === "client" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard title="Active Cases" value="—" icon={Heart} iconColor="text-red-500" iconBg="bg-red-50" description="Ongoing care services" />
            <StatsCard title="Professionals" value="—" icon={Users} iconColor="text-[#0F4C81]" iconBg="bg-[#EBF4FF]" description="Assigned to your care" />
            <StatsCard title="Next Appointment" value="—" icon={Clock} iconColor="text-[#F59E0B]" iconBg="bg-amber-50" description="Upcoming schedule" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAssignments && recentAssignments.length > 0 ? (
                <ul className="space-y-3">
                  {recentAssignments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0F172A] truncate">{a.title}</p>
                        <p className="text-xs text-[#64748B]">{formatDate(a.start_date)} · {humanizeServiceType(a.service_type)}</p>
                      </div>
                      <Badge variant={a.status as "active" | "pending" | "completed" | "cancelled"} className="flex-shrink-0">
                        {a.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Briefcase className="h-8 w-8 text-[#CBD5E1] mb-2" />
                  <p className="text-sm text-[#64748B]">No assignments yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {role === "admin" && quickActionsAdmin.map((action) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={action.href}
                      href={action.href}
                      className="flex items-center gap-2.5 rounded-lg border border-[#E2E8F0] p-3 hover:bg-[#F8FAFC] hover:border-[#0F4C81]/30 transition-colors group"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EBF4FF] group-hover:bg-[#0F4C81] transition-colors">
                        <Icon className="h-4 w-4 text-[#0F4C81] group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-[#374151]">{action.label}</span>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function humanizeRole(role: string) {
  const map: Record<string, string> = {
    admin: "Administrator",
    professional: "Healthcare Professional",
    organization: "Organization",
    client: "Home-Care Client",
  };
  return map[role] ?? role;
}

function humanizeServiceType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const quickActionsAdmin = [
  { label: "New Assignment", href: "/assignments/new", icon: Briefcase },
  { label: "Add Professional", href: "/professionals/new", icon: UserCheck },
  { label: "Add Client", href: "/clients/new", icon: Heart },
  { label: "View Analytics", href: "/admin/analytics", icon: TrendingUp },
];
