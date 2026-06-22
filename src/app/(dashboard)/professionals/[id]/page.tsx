import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Phone, Mail, MapPin, Star, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getInitials, humanizeProfession, humanizeStatus, generateAvatarUrl, scoreToGrade, formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Professional Profile" };

export default async function ProfessionalProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawPro } = await supabase
    .from("professionals")
    .select(`
      id, profession, specialty, years_of_experience, workforce_status,
      rating, total_assignments, is_verified, bio, availability,
      profiles!inner(id, full_name, email, phone, avatar_url, address)
    `)
    .eq("id", params.id)
    .single();

  if (!rawPro) notFound();

  type ProRow = typeof rawPro & {
    profiles: { id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; address: string | null } | { id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null; address: string | null }[];
  };
  const pro = rawPro as ProRow;
  const profile = Array.isArray(pro.profiles) ? pro.profiles[0] : pro.profiles;

  // Recent scorecards
  const { data: scorecards } = await supabase
    .from("scorecards")
    .select("id, period_month, period_year, overall_score, attendance, punctuality, professionalism, communication, clinical_competence, teamwork, patient_care")
    .eq("professional_id", params.id)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(3);

  // Recent assignments
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, status, service_type, location, start_date, end_date")
    .eq("professional_id", params.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="animate-fade-in">
      <Header title="Professional Profile" subtitle={profile.full_name} />

      <div className="p-6 max-w-4xl space-y-6">
        <Link href="/professionals" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back to Professionals
        </Link>

        {/* Profile header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <Avatar className="h-20 w-20 flex-shrink-0">
                <AvatarImage src={profile.avatar_url ?? generateAvatarUrl(profile.full_name)} />
                <AvatarFallback className="text-2xl">{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-start gap-3 mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">{profile.full_name}</h2>
                    <p className="text-sm text-[#64748B]">{humanizeProfession(pro.profession)}{pro.specialty && ` — ${pro.specialty}`}</p>
                  </div>
                  <div className="flex gap-2 ml-auto flex-wrap">
                    <Badge variant={pro.workforce_status as "available" | "assigned" | "on_leave" | "under_review" | "suspended" | "resigned"}>
                      {humanizeStatus(pro.workforce_status)}
                    </Badge>
                    {pro.is_verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#22C55E] bg-green-50 px-2 py-1 rounded-full">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#0F4C81]">{pro.years_of_experience}</p>
                    <p className="text-xs text-[#64748B]">Years Exp.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#0F4C81]">{pro.total_assignments}</p>
                    <p className="text-xs text-[#64748B]">Assignments</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#F59E0B] flex items-center justify-center gap-1">
                      <Star className="h-5 w-5 fill-current" />
                      {pro.rating ? pro.rating.toFixed(1) : "N/A"}
                    </p>
                    <p className="text-xs text-[#64748B]">Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#22C55E]">{pro.is_verified ? "Yes" : "No"}</p>
                    <p className="text-xs text-[#64748B]">Verified</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-[#64748B]">
                  {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone}</span>}
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{profile.email}</span>
                  {profile.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.address}</span>}
                </div>
              </div>
            </div>

            {pro.bio && (
              <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
                <p className="text-sm text-[#374151] leading-relaxed">{pro.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Scorecards */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Scorecards</CardTitle>
              <Link href="/performance" className="text-xs text-[#0F4C81] hover:underline">All scorecards</Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {scorecards && scorecards.length > 0 ? scorecards.map((sc) => (
                <div key={sc.id} className="rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[#0F172A]">{monthNames[sc.period_month - 1]} {sc.period_year}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F4C81]">{sc.overall_score.toFixed(1)}%</span>
                      <span className="text-xs font-bold bg-[#EBF4FF] text-[#0F4C81] px-2 py-0.5 rounded-full">{scoreToGrade(sc.overall_score)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {["attendance","punctuality","professionalism","patient_care"].map((k) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs text-[#94A3B8] w-28 capitalize">{k.replace(/_/g, " ")}</span>
                        <Progress value={sc[k as keyof typeof sc] as number} className="flex-1 h-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-[#94A3B8] text-center py-4">No scorecards yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignments && assignments.length > 0 ? assignments.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{a.title}</p>
                    <p className="text-xs text-[#94A3B8]">{a.location} · {a.service_type.replace(/_/g, " ")}</p>
                    {a.start_date && <p className="text-xs text-[#CBD5E1]">{formatDate(a.start_date)}</p>}
                  </div>
                  <Badge variant={({ pending:"pending", active:"active", completed:"completed", cancelled:"cancelled" } as Record<string,"active"|"pending"|"completed"|"cancelled">)[a.status] ?? "default"}>
                    {a.status}
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-[#94A3B8] text-center py-4">No assignments yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
