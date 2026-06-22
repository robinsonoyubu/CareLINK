import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, Award } from "lucide-react";
import Link from "next/link";
import { scoreToGrade, humanizeProfession } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Performance" };

const metrics = [
  { key: "attendance", label: "Attendance" },
  { key: "punctuality", label: "Punctuality" },
  { key: "professionalism", label: "Professionalism" },
  { key: "communication", label: "Communication" },
  { key: "clinical_competence", label: "Clinical Competence" },
  { key: "teamwork", label: "Teamwork" },
  { key: "patient_care", label: "Patient Care" },
] as const;

const gradeColors: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-700",
  "A": "bg-green-100 text-green-700",
  "B+": "bg-blue-100 text-blue-700",
  "B": "bg-blue-100 text-blue-700",
  "C": "bg-yellow-100 text-yellow-700",
  "D": "bg-orange-100 text-orange-700",
  "F": "bg-red-100 text-red-700",
};

export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  let scorecardQuery = supabase
    .from("scorecards")
    .select(`
      id, period_month, period_year, overall_score,
      attendance, punctuality, professionalism, communication,
      clinical_competence, teamwork, patient_care, notes, created_at,
      professionals!inner(
        id, profession,
        profiles!inner(full_name)
      )
    `)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  if (profile?.role === "professional") {
    const { data: pro } = await supabase.from("professionals").select("id").eq("profile_id", user.id).single();
    if (pro) scorecardQuery = scorecardQuery.eq("professional_id", pro.id);
  }

  const { data: rawScorecards } = await scorecardQuery;

  type ScorecardRow = {
    id: string;
    period_month: number;
    period_year: number;
    overall_score: number;
    attendance: number;
    punctuality: number;
    professionalism: number;
    communication: number;
    clinical_competence: number;
    teamwork: number;
    patient_care: number;
    notes: string | null;
    created_at: string;
    professionals: {
      id: string;
      profession: string;
      profiles: { full_name: string } | { full_name: string }[];
    } | null;
  };
  const scorecards = rawScorecards as ScorecardRow[] | null;

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="animate-fade-in">
      <Header
        title="Performance Management"
        subtitle="Monthly scorecards and evaluations"
        actions={
          profile?.role === "admin" ? (
            <Link href="/performance/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New Scorecard
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-6 space-y-6">
        {scorecards && scorecards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Total Evaluations",
                value: scorecards.length,
                icon: Award,
                color: "text-[#0F4C81]",
                bg: "bg-[#EBF4FF]",
              },
              {
                label: "Average Score",
                value: `${(scorecards.reduce((s, c) => s + c.overall_score, 0) / scorecards.length).toFixed(1)}%`,
                icon: TrendingUp,
                color: "text-[#22C55E]",
                bg: "bg-green-50",
              },
              {
                label: "Top Grade",
                value: scoreToGrade(Math.max(...scorecards.map(c => c.overall_score))),
                icon: Award,
                color: "text-[#F59E0B]",
                bg: "bg-amber-50",
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#0F172A]">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {scorecards && scorecards.length > 0 ? (
          <div className="space-y-4">
            {scorecards.map((sc) => {
              const pro = sc.professionals;
              const proProfile = pro ? (Array.isArray(pro.profiles) ? pro.profiles[0] : pro.profiles) : null;
              const grade = scoreToGrade(sc.overall_score);
              return (
                <Card key={sc.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {proProfile?.full_name}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {humanizeProfession(pro?.profession ?? "")} · {monthNames[sc.period_month - 1]} {sc.period_year}
                            </p>
                          </div>
                          <span className={`ml-auto sm:ml-0 inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${gradeColors[grade] ?? "bg-gray-100 text-gray-600"}`}>
                            {grade}
                          </span>
                          <span className="text-lg font-bold text-[#0F172A]">
                            {sc.overall_score.toFixed(1)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {metrics.map((m) => (
                            <div key={m.key} className="flex items-center gap-2">
                              <span className="text-xs text-[#64748B] w-36 flex-shrink-0">{m.label}</span>
                              <Progress value={sc[m.key]} className="flex-1 h-1.5" />
                              <span className="text-xs font-medium text-[#374151] w-10 text-right">{sc[m.key]}%</span>
                            </div>
                          ))}
                        </div>
                        {sc.notes && (
                          <p className="mt-3 text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg px-3 py-2">
                            {sc.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-[#0F4C81]" />
            </div>
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">No scorecards yet</h3>
            <p className="text-sm text-[#64748B] mb-4">Monthly performance evaluations will appear here.</p>
            {profile?.role === "admin" && (
              <Link href="/performance/new">
                <Button><Plus className="h-4 w-4" /> Create Scorecard</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
