import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organizations" };

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: orgs } = await supabase
    .from("organizations")
    .select(`
      id, name, type, contact_email, contact_phone, city, state,
      is_verified, created_at,
      profiles(full_name, email)
    `)
    .order("created_at", { ascending: false });

  type OrgRow = {
    id: string; name: string; type: string;
    contact_email: string | null; contact_phone: string | null;
    city: string | null; state: string | null;
    is_verified: boolean; created_at: string;
    profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
  };

  const organizations = orgs as unknown as OrgRow[] | null;

  return (
    <div className="animate-fade-in">
      <Header title="Organizations" subtitle="All registered organizations" />

      <div className="p-6">
        {organizations && organizations.length > 0 ? (
          <div className="space-y-3">
            {organizations.map((org) => {
              const contactProfile = org.profiles
                ? (Array.isArray(org.profiles) ? org.profiles[0] : org.profiles)
                : null;

              return (
                <Link key={org.id} href={`/organizations/${org.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-[#EBF4FF] flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-[#0F4C81]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-[#0F172A] truncate">{org.name}</p>
                              {org.is_verified && (
                                <span className="text-xs font-medium text-[#22C55E] bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Verified</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-[#64748B]">
                              <span className="capitalize">{org.type?.replace(/_/g, " ")}</span>
                              {(org.city || org.state) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {[org.city, org.state].filter(Boolean).join(", ")}
                                </span>
                              )}
                              {org.contact_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{org.contact_email}
                                </span>
                              )}
                              {org.contact_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{org.contact_phone}
                                </span>
                              )}
                            </div>
                            {contactProfile && (
                              <p className="text-xs text-[#94A3B8] mt-0.5">Contact: {contactProfile.full_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <Badge variant="default" className="mb-1">
                            {org.type?.replace(/_/g, " ")}
                          </Badge>
                          <p className="text-xs text-[#94A3B8]">{formatDate(org.created_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No organizations yet</h3>
            <p className="text-sm text-[#64748B]">Organizations will appear here once they register on the platform.</p>
          </div>
        )}
      </div>
    </div>
  );
}
