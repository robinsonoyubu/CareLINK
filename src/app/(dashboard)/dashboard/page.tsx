import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Users, UserCheck, Briefcase, Heart, Building2, TrendingUp, Hospital, FlaskConical, Pill, Ambulance, Coins, Newspaper, Siren, Bot, Fingerprint, CalendarCheck } from "lucide-react";
import { BookingStatusBadge } from "@/components/medlink/badges";
import { BOOKING_KIND_LABELS, type BookingKind } from "@/lib/medlink/bookings";
import { formatDate, formatDateTime, humanizeRole } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

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

  const [{ data: upcoming }, { data: wallet }, { data: pro }] = await Promise.all([
    supabase.from("bookings")
      .select("id, reference, kind, status, scheduled_at, provider:service_providers(name), service:provider_services(name)")
      .eq("booker_id", user.id)
      .not("status", "in", "(completed,cancelled,declined)")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.from("coin_wallets").select("balance").eq("profile_id", user.id).maybeSingle(),
    role === "professional"
      ? supabase.from("professionals").select("id, workforce_status, application_status, total_assignments, rating").eq("profile_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const upcomingRows = (upcoming ?? []) as unknown as { id: string; reference: string; kind: BookingKind; status: string; scheduled_at: string | null; provider: { name: string } | null; service: { name: string } | null }[];

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

      <div className="p-4 md:p-6 space-y-6">
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
            <StatsCard title="My Assignments" value={pro?.total_assignments ?? 0} icon={Briefcase} iconColor="text-[#0F4C81]" iconBg="bg-[#EBF4FF]" description="Total career assignments" />
            <StatsCard title="Workforce Status" value={(pro?.workforce_status ?? "under_review").replace(/_/g, " ")} icon={UserCheck} iconColor="text-[#22C55E]" iconBg="bg-green-50"
              description={pro?.application_status === "verified" ? "RGH Verified" : `Application: ${(pro?.application_status ?? "submitted").replace(/_/g, " ")}`} />
            <StatsCard title="Rating" value={pro?.rating != null ? Number(pro.rating).toFixed(1) : "—"} icon={TrendingUp} iconColor="text-[#F59E0B]" iconBg="bg-amber-50" description="From completed MedLINK services" />
          </div>
        )}

        <Link href="/ambulance?emergency=1" className="flex items-center justify-between gap-3 rounded-xl bg-red-600 px-5 py-4 text-white shadow-sm hover:bg-red-700">
          <span className="flex items-center gap-3"><Siren className="h-6 w-6" /><span><span className="block font-semibold">Emergency</span><span className="block text-sm text-white/80">Request an ambulance or paramedics now</span></span></span>
          <span className="text-sm font-semibold">Get help →</span>
        </Link>

        <nav aria-label="Services" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <Link key={svc.href} href={svc.href} className="flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4 text-center hover:border-[#0F4C81]/40 hover:shadow-sm transition">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF4FF]"><Icon className="h-5 w-5 text-[#0F4C81]" /></span>
                <span className="text-sm font-medium text-[#0F172A]">{svc.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upcoming bookings</CardTitle>
              <Link href="/bookings" className="text-sm text-[#0F4C81] hover:underline">My Bookings</Link>
            </CardHeader>
            <CardContent>
              {upcomingRows.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <CalendarCheck className="h-8 w-8 text-[#CBD5E1] mb-2" />
                  <p className="text-sm text-[#64748B]">Nothing booked. Choose a service above.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#F1F5F9]">
                  {upcomingRows.map((b) => (
                    <li key={b.id}>
                      <Link href={`/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">{[b.service?.name, b.provider?.name].filter(Boolean).join(" — ") || BOOKING_KIND_LABELS[b.kind]}</span>
                          <span className="block text-xs text-[#64748B]">{b.reference}{b.scheduled_at ? ` · ${formatDateTime(b.scheduled_at)}` : ""}</span>
                        </span>
                        <BookingStatusBadge status={b.status} className="flex-shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Earn</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold flex items-center gap-2"><Coins className="h-6 w-6 text-amber-500" />{wallet?.balance ?? 0}</p>
              <p className="text-xs text-[#64748B]">coins · withdraw from 100</p>
              <Link href="/earn" className="text-sm text-[#0F4C81] hover:underline">Watch ads & play games →</Link>
              <Link href="/assistant" className="mt-3 flex items-center gap-2 rounded-lg bg-[#EBF4FF] p-3 text-sm text-[#0F4C81]"><Bot className="h-4 w-4" />Ask the MedLINK AI Health Assistant</Link>
              {role === "professional" && <Link href="/attendance" className="flex items-center gap-2 rounded-lg bg-[#F1F5F9] p-3 text-sm"><Fingerprint className="h-4 w-4" />My Attendance</Link>}
            </CardContent>
          </Card>
        </div>

        {(role === "admin" || role === "professional") && (
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
        )}
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

function humanizeServiceType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const services = [
  { label: "Hospitals", href: "/hospitals", icon: Hospital },
  { label: "Diagnostics", href: "/diagnostics", icon: FlaskConical },
  { label: "Pharmacy", href: "/pharmacy", icon: Pill },
  { label: "Ambulance & Paramedics", href: "/ambulance", icon: Ambulance },
  { label: "Professional care", href: "/bookings/new", icon: Heart },
  { label: "Health Gist", href: "/health-gist", icon: Newspaper },
];

const quickActionsAdmin = [
  { label: "New Assignment", href: "/assignments/new", icon: Briefcase },
  { label: "Add Professional", href: "/professionals/new", icon: UserCheck },
  { label: "Add Client", href: "/clients/new", icon: Heart },
  { label: "View Analytics", href: "/admin/analytics", icon: TrendingUp },
];
