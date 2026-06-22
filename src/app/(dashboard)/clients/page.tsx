import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Phone, Mail } from "lucide-react";
import { getInitials, generateAvatarUrl, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: clients } = await supabase
    .from("clients")
    .select(`
      id, is_verified, medical_notes, created_at,
      profiles(id, full_name, email, phone, avatar_url, address)
    `)
    .order("created_at", { ascending: false });

  type ClientRow = {
    id: string; is_verified: boolean; medical_notes: string | null; created_at: string;
    profiles: { id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; address: string | null }
            | { id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; address: string | null }[]
            | null;
  };

  const rows = clients as unknown as ClientRow[] | null;

  return (
    <div className="animate-fade-in">
      <Header title="Clients" subtitle="All registered home-care clients" />

      <div className="p-6">
        {rows && rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((c) => {
              const p = c.profiles
                ? (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles)
                : null;

              return (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={p?.avatar_url ?? (p ? generateAvatarUrl(p.full_name) : undefined)} />
                          <AvatarFallback className="text-sm">{p ? getInitials(p.full_name) : "?"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">{p?.full_name ?? "Unknown"}</p>
                            {c.is_verified && (
                              <span className="text-xs font-medium text-[#22C55E] bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Verified</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-[#64748B]">
                            {p?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                            {p?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                          </div>
                          {p?.address && <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{p.address}</p>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <Badge variant={c.is_verified ? "completed" : "pending"} className="mb-1">
                          {c.is_verified ? "Verified" : "Pending"}
                        </Badge>
                        <p className="text-xs text-[#94A3B8]">{formatDate(c.created_at)}</p>
                      </div>
                    </div>
                    {c.medical_notes && (
                      <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                        <p className="text-xs text-[#64748B] line-clamp-1">
                          <span className="font-medium text-[#374151]">Notes:</span> {c.medical_notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No clients yet</h3>
            <p className="text-sm text-[#64748B]">Clients will appear here once they register for home care services.</p>
          </div>
        )}
      </div>
    </div>
  );
}
