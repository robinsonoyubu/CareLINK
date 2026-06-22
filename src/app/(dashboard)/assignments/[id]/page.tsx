import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, User, Building2, FileText } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getInitials, humanizeProfession, humanizeStatus, generateAvatarUrl } from "@/lib/utils";
import { AssignmentStatusActions } from "@/components/assignments/status-actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assignment Details" };

const statusColors: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
  active: "active",
  pending: "pending",
  completed: "completed",
  cancelled: "cancelled",
};

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  type AssignmentRow = {
    id: string;
    title: string;
    description: string | null;
    service_type: string;
    duration_type: string;
    status: string;
    start_date: string;
    end_date: string | null;
    location: string;
    hourly_rate: number | null;
    requirements: string | null;
    created_at: string;
    updated_at: string;
    professionals: {
      id: string; profession: string; specialty: string | null;
      workforce_status: string; is_verified: boolean;
      profiles: { full_name: string; email: string; phone: string | null; avatar_url: string | null }
              | { full_name: string; email: string; phone: string | null; avatar_url: string | null }[];
    } | null;
    clients: {
      id: string;
      profiles: { full_name: string; email: string; phone: string | null }
              | { full_name: string; email: string; phone: string | null }[];
    } | null;
    organizations: { id: string; name: string } | null;
  };

  const { data } = await supabase
    .from("assignments")
    .select(`
      id, title, description, service_type, duration_type, status,
      start_date, end_date, location, hourly_rate, requirements,
      created_at, updated_at,
      professionals(
        id, profession, specialty, workforce_status, is_verified,
        profiles(full_name, email, phone, avatar_url)
      ),
      clients(
        id,
        profiles(full_name, email, phone)
      ),
      organizations(
        id, name
      )
    `)
    .eq("id", id)
    .single();

  if (!data) notFound();
  const a = data as unknown as AssignmentRow;

  const pro = a.professionals;
  const proProfile = pro ? (Array.isArray(pro.profiles) ? pro.profiles[0] : pro.profiles) : null;
  const clientProfiles = a.clients ? (Array.isArray(a.clients.profiles) ? a.clients.profiles[0] : a.clients.profiles) : null;

  // Payments linked to this assignment
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, payment_method, paid_at, created_at")
    .eq("assignment_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="animate-fade-in">
      <Header title="Assignment Details" subtitle={a.title} />

      <div className="p-6 max-w-4xl space-y-6">
        <Link href="/assignments" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back to Assignments
        </Link>

        {/* Summary card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] mb-1">{a.title}</h2>
                <p className="text-sm text-[#64748B] capitalize">{a.service_type?.replace(/_/g, " ")} · {a.duration_type}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusColors[a.status] ?? "default"} className="text-sm px-3 py-1">
                  {humanizeStatus(a.status)}
                </Badge>
                {isAdmin && <AssignmentStatusActions assignmentId={a.id} currentStatus={a.status} />}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {a.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#94A3B8]">Location</p>
                    <p className="text-sm font-medium text-[#0F172A]">{a.location}</p>
                  </div>
                </div>
              )}
              {a.start_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#94A3B8]">Start Date</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatDate(a.start_date)}</p>
                  </div>
                </div>
              )}
              {a.end_date && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#94A3B8]">End Date</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatDate(a.end_date)}</p>
                  </div>
                </div>
              )}
              {a.hourly_rate && (
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#94A3B8]">Rate</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatCurrency(a.hourly_rate)}/hr</p>
                  </div>
                </div>
              )}
            </div>

            {a.description && (
              <div className="pt-4 border-t border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-sm text-[#374151] leading-relaxed">{a.description}</p>
              </div>
            )}

            {a.requirements && (
              <div className="pt-4 border-t border-[#F1F5F9] mt-4">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Requirements</p>
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">{a.requirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Professional */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Assigned Professional
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pro && proProfile ? (
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={proProfile.avatar_url ?? generateAvatarUrl(proProfile.full_name)} />
                    <AvatarFallback>{getInitials(proProfile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link href={`/professionals/${pro.id}`} className="text-sm font-semibold text-[#0F4C81] hover:underline">
                      {proProfile.full_name}
                    </Link>
                    <p className="text-xs text-[#64748B]">{humanizeProfession(pro.profession)}{pro.specialty && ` — ${pro.specialty}`}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{proProfile.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#94A3B8]">No professional assigned yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Client / Organization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Client / Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clientProfiles && (
                <div>
                  <p className="text-xs text-[#94A3B8] mb-0.5">Client</p>
                  <p className="text-sm font-medium text-[#0F172A]">{clientProfiles.full_name}</p>
                  <p className="text-xs text-[#64748B]">{clientProfiles.email}</p>
                  {clientProfiles.phone && <p className="text-xs text-[#64748B]">{clientProfiles.phone}</p>}
                </div>
              )}
              {a.organizations && (
                <div>
                  <p className="text-xs text-[#94A3B8] mb-0.5">Organization</p>
                  <p className="text-sm font-medium text-[#0F172A]">{a.organizations.name}</p>
                </div>
              )}
              {!clientProfiles && !a.organizations && (
                <p className="text-sm text-[#94A3B8]">No client or organization linked.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments && payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-[#94A3B8]">{p.payment_method} · {formatDate(p.created_at)}</p>
                    </div>
                    <Badge variant={({ paid: "completed", failed: "cancelled", pending: "pending", refunded: "default" } as Record<string, "completed" | "cancelled" | "pending" | "default">)[p.status] ?? "default"}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No payments recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
