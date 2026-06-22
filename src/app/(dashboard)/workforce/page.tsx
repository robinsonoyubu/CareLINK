import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, humanizeProfession, humanizeStatus, generateAvatarUrl } from "@/lib/utils";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workforce" };

export default async function WorkforcePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: professionals } = await supabase
    .from("professionals")
    .select(`
      id, profession, specialty, years_of_experience, workforce_status,
      rating, total_assignments, is_verified, availability,
      profiles!inner(id, full_name, email, avatar_url, phone)
    `)
    .order("workforce_status")
    .order("created_at", { ascending: false });

  const statusCounts = (professionals ?? []).reduce((acc: Record<string, number>, p) => {
    acc[p.workforce_status] = (acc[p.workforce_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <Header title="Workforce Hub" subtitle={`${professionals?.length ?? 0} professionals total`} />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { status: "available", label: "Available", color: "bg-green-100 text-green-700" },
            { status: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-700" },
            { status: "on_leave", label: "On Leave", color: "bg-yellow-100 text-yellow-700" },
            { status: "under_review", label: "Under Review", color: "bg-orange-100 text-orange-700" },
            { status: "suspended", label: "Suspended", color: "bg-red-100 text-red-700" },
            { status: "resigned", label: "Resigned", color: "bg-gray-100 text-gray-600" },
          ].map((s) => (
            <div key={s.status} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{statusCounts[s.status] ?? 0}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {professionals && professionals.length > 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Professional</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Profession</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Exp.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Assignments</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Rating</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {professionals.map((pro) => {
                    const profile = Array.isArray(pro.profiles) ? pro.profiles[0] : pro.profiles;
                    return (
                      <tr key={pro.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={profile?.avatar_url ?? generateAvatarUrl(profile?.full_name ?? "")} />
                              <AvatarFallback className="text-xs">{getInitials(profile?.full_name ?? "?")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-[#0F172A]">{profile?.full_name}</p>
                              <p className="text-xs text-[#94A3B8]">{profile?.phone ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-[#374151]">{humanizeProfession(pro.profession)}</p>
                            {pro.specialty && <p className="text-xs text-[#94A3B8]">{pro.specialty}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={pro.workforce_status as "available" | "assigned" | "on_leave" | "under_review" | "suspended" | "resigned"}>
                            {humanizeStatus(pro.workforce_status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[#374151]">{pro.years_of_experience}yr{pro.years_of_experience !== 1 ? "s" : ""}</td>
                        <td className="px-4 py-3 text-[#374151]">{pro.total_assignments}</td>
                        <td className="px-4 py-3 text-[#374151]">
                          {pro.rating ? (
                            <span className="flex items-center gap-1">
                              <span className="text-[#F59E0B]">★</span>
                              {pro.rating.toFixed(1)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {pro.is_verified ? (
                            <span className="text-[#22C55E] text-xs font-semibold">✓ Yes</span>
                          ) : (
                            <span className="text-[#94A3B8] text-xs">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No professionals yet</h3>
            <p className="text-sm text-[#64748B]">Register professionals to populate the workforce hub.</p>
          </div>
        )}
      </div>
    </div>
  );
}
