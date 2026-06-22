"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { scorecardSchema, type ScorecardInput } from "@/validations";
import { ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";

type Professional = { id: string; name: string; profession: string };

const metricLabels: { key: keyof ScorecardInput; label: string }[] = [
  { key: "attendance", label: "Attendance" },
  { key: "punctuality", label: "Punctuality" },
  { key: "professionalism", label: "Professionalism" },
  { key: "communication", label: "Communication" },
  { key: "clinical_competence", label: "Clinical Competence" },
  { key: "teamwork", label: "Teamwork" },
  { key: "patient_care", label: "Patient Care" },
];

export default function NewScorecardPage() {
  const router = useRouter();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<ScorecardInput>({
    resolver: zodResolver(scorecardSchema) as Resolver<ScorecardInput>,
    defaultValues: {
      attendance: 80, punctuality: 80, professionalism: 80,
      communication: 80, clinical_competence: 80, teamwork: 80, patient_care: 80,
      period_month: new Date().getMonth() + 1,
      period_year: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    async function loadProfessionals() {
      const supabase = createClient();
      const { data } = await supabase
        .from("professionals")
        .select("id, profession, profiles!inner(full_name)")
        .order("created_at", { ascending: false });
      if (data) {
        setProfessionals(
          data.map((p: { id: string; profession: string; profiles: { full_name: string } | { full_name: string }[] }) => ({
            id: p.id,
            profession: p.profession,
            name: Array.isArray(p.profiles) ? p.profiles[0].full_name : p.profiles.full_name,
          }))
        );
      }
    }
    loadProfessionals();
  }, []);

  async function onSubmit(data: ScorecardInput) {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("scorecards").insert({
      ...data,
      created_by: user.id,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/performance");
  }

  const watchedMetrics = watch(["attendance", "punctuality", "professionalism", "communication", "clinical_competence", "teamwork", "patient_care"]);
  const average = watchedMetrics.reduce((s, v) => s + (Number(v) || 0), 0) / 7;

  return (
    <div className="animate-fade-in">
      <Header title="New Scorecard" subtitle="Evaluate a professional's monthly performance" />

      <div className="p-6 max-w-2xl space-y-6">
        <Link href="/performance" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back to Performance
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Evaluation Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Professional *</Label>
                <Controller
                  name="professional_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select professional..." /></SelectTrigger>
                      <SelectContent>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} — {p.profession}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="period_month">Month *</Label>
                  <Controller
                    name="period_month"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                            <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="period_year">Year *</Label>
                  <Input
                    id="period_year"
                    type="number"
                    min={2020}
                    max={2030}
                    {...register("period_year", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Performance Metrics</CardTitle>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#0F4C81]" />
                  <span className="text-sm font-bold text-[#0F4C81]">{average.toFixed(1)}% avg</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {metricLabels.map((m) => (
                <div key={m.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={m.key}>{m.label}</Label>
                    <span className="text-sm font-medium text-[#374151]">{watch(m.key as keyof ScorecardInput)}%</span>
                  </div>
                  <input
                    id={m.key}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    className="w-full h-2 bg-[#E2E8F0] rounded-full appearance-none cursor-pointer accent-[#0F4C81]"
                    {...register(m.key as keyof ScorecardInput, { valueAsNumber: true })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Optional comments on the professional's performance this period..."
                rows={3}
                {...register("notes")}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting} className="flex-1 sm:flex-none sm:min-w-[160px]">
              Submit Scorecard
            </Button>
            <Link href="/performance">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
