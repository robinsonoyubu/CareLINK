import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Calendar, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Service Requests" };

export default async function OrgRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "organization" && profile?.role !== "admin") redirect("/dashboard");

  const { data: org } = await supabase.from("organizations").select("id").eq("profile_id", user.id).single();

  let query = supabase
    .from("assignments")
    .select("id, title, status, service_type, location, start_date, end_date, description")
    .order("created_at", { ascending: false });

  if (org) query = query.eq("organization_id", org.id);

  const { data: requests } = await query;

  const statusVariant: Record<string, "active" | "pending" | "completed" | "cancelled"> = {
    pending: "pending", active: "active", completed: "completed", cancelled: "cancelled",
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Service Requests"
        subtitle="Staffing and care service requests"
      />

      <div className="p-6 space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> All staff deployments are managed by RAFFATI admin. You will be notified once a professional is assigned to your request.
          </p>
        </div>

        {requests && requests.length > 0 ? (
          requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] mb-1">{r.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[#64748B] mb-2">
                      <span className="capitalize">{r.service_type.replace(/_/g, " ")}</span>
                      {r.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{r.location}
                        </span>
                      )}
                      {r.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{formatDate(r.start_date)}
                          {r.end_date && ` – ${formatDate(r.end_date)}`}
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-[#94A3B8] line-clamp-2">{r.description}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant[r.status] ?? "default"} className="flex-shrink-0">{r.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No requests yet</h3>
            <p className="text-sm text-[#64748B] mb-4">RAFFATI admin will create service requests on your behalf. Contact us to discuss your staffing needs.</p>
            <Link href="/contact">
              <Button variant="outline">Contact RAFFATI</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
