import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, MapPin, Phone, Mail, Globe, FileText, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDate, humanizeStatus } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organization Details" };

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  type OrgRow = {
    id: string; name: string; type: string; registration_number: string | null;
    address: string | null; city: string | null; state: string | null; country: string;
    contact_email: string | null; contact_phone: string | null; website: string | null;
    is_verified: boolean; created_at: string;
    profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  };

  const { data: orgData } = await supabase
    .from("organizations")
    .select(`
      id, name, type, registration_number, address, city, state, country,
      contact_email, contact_phone, website, is_verified, created_at,
      profiles(full_name, email)
    `)
    .eq("id", id)
    .single();

  if (!orgData) notFound();
  const org = orgData as unknown as OrgRow;

  const orgProfile = org.profiles
    ? (Array.isArray(org.profiles) ? org.profiles[0] : org.profiles)
    : null;

  // Active assignments for this org
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, status, service_type, location, start_date, end_date")
    .eq("organization_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Payment summary
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, status, paid_at")
    .eq("organization_id", id)
    .order("paid_at", { ascending: false })
    .limit(5);

  const totalPaid = payments?.filter((p) => p.status === "paid").reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

  const statusColors: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
    active: "active", pending: "pending", completed: "completed", cancelled: "cancelled",
  };

  return (
    <div className="animate-fade-in">
      <Header title="Organization Details" subtitle={org.name} />

      <div className="p-6 max-w-4xl space-y-6">
        <Link href="/workforce" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Org header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-[#EBF4FF] flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-7 w-7 text-[#0F4C81]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">{org.name}</h2>
                  <p className="text-sm text-[#64748B] capitalize">{org.type?.replace(/_/g, " ")}</p>
                </div>
              </div>
              {org.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#22C55E] bg-green-50 px-3 py-1.5 rounded-full">
                  Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {org.contact_email && (
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Mail className="h-4 w-4 text-[#94A3B8]" />
                  <a href={`mailto:${org.contact_email}`} className="hover:text-[#0F4C81]">{org.contact_email}</a>
                </div>
              )}
              {org.contact_phone && (
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Phone className="h-4 w-4 text-[#94A3B8]" />
                  {org.contact_phone}
                </div>
              )}
              {org.address && (
                <div className="flex items-center gap-2 text-[#64748B]">
                  <MapPin className="h-4 w-4 text-[#94A3B8]" />
                  {[org.address, org.city, org.state].filter(Boolean).join(", ")}
                </div>
              )}
              {org.website && (
                <div className="flex items-center gap-2 text-[#64748B]">
                  <Globe className="h-4 w-4 text-[#94A3B8]" />
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#0F4C81] truncate">{org.website}</a>
                </div>
              )}
              {org.registration_number && (
                <div className="flex items-center gap-2 text-[#64748B]">
                  <FileText className="h-4 w-4 text-[#94A3B8]" />
                  Reg: {org.registration_number}
                </div>
              )}
              <div className="flex items-center gap-2 text-[#64748B]">
                <Calendar className="h-4 w-4 text-[#94A3B8]" />
                Member since {formatDate(org.created_at)}
              </div>
            </div>

            {orgProfile && (
              <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                <p className="text-xs text-[#94A3B8] mb-1">Account contact</p>
                <p className="text-sm font-medium text-[#0F172A]">{orgProfile.full_name}</p>
                <p className="text-xs text-[#64748B]">{orgProfile.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Assignments", value: assignments?.length ?? 0 },
            { label: "Active", value: assignments?.filter((a) => a.status === "active").length ?? 0 },
            { label: "Total Paid", value: `₦${totalPaid.toLocaleString()}` },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#0F4C81]">{s.value}</p>
                <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments && assignments.length > 0 ? (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <Link key={a.id} href={`/assignments/${a.id}`} className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{a.title}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {a.service_type.replace(/_/g, " ")}
                        {a.location && ` · ${a.location}`}
                        {a.start_date && ` · ${formatDate(a.start_date)}`}
                      </p>
                    </div>
                    <Badge variant={statusColors[a.status] ?? "default"} className="ml-3 flex-shrink-0">
                      {humanizeStatus(a.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">No assignments yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        {payments && payments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">₦{(p.amount ?? 0).toLocaleString()}</p>
                      {p.paid_at && <p className="text-xs text-[#94A3B8]">{formatDate(p.paid_at)}</p>}
                    </div>
                    <Badge variant={({ paid: "completed", failed: "cancelled", pending: "pending" } as Record<string, "completed" | "cancelled" | "pending">)[p.status] ?? "default"}>
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
