"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { assignmentSchema, type AssignmentInput } from "@/validations";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewAssignmentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiMatches, setAiMatches] = useState<{ professional_id: string; name: string; match_score: number; match_reasons: string[] }[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<AssignmentInput>({
    resolver: zodResolver(assignmentSchema),
  });

  const serviceType = watch("service_type");
  const durationType = watch("duration_type");
  const location = watch("location");

  async function runAiMatch() {
    if (!serviceType || !durationType || !location) return;
    setAiMatching(true);
    setAiMatches([]);
    const res = await fetch("/api/ai/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_type: serviceType,
        duration_type: durationType,
        location,
        requirements: watch("description") ?? "",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiMatches(data.matches ?? []);
    }
    setAiMatching(false);
  }

  async function onSubmit(data: AssignmentInput) {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("assignments").insert({
      ...data,
      professional_id: selectedProfessionalId,
      assigned_by: user.id,
      status: "pending",
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/assignments");
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="New Assignment"
        subtitle="Create and assign a new care deployment"
      />

      <div className="p-6 max-w-3xl space-y-6">
        <Link href="/assignments" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back to Assignments
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Assignment Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="Post-surgery home nursing care" error={errors.title?.message} {...register("title")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Service Type *</Label>
                  <Controller
                    name="service_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home_care">Home Care</SelectItem>
                          <SelectItem value="nursing">Nursing</SelectItem>
                          <SelectItem value="caregiver">Caregiver</SelectItem>
                          <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                          <SelectItem value="staffing">Hospital Staffing</SelectItem>
                          <SelectItem value="outsourcing">Outsourcing</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration Type *</Label>
                  <Controller
                    name="duration_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select duration..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="live_in">Live-In</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" placeholder="Lagos Island, Lagos" error={errors.location?.message} {...register("location")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input id="start_date" type="date" error={errors.start_date?.message} {...register("start_date")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input id="end_date" type="date" {...register("end_date")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hourly_rate">Hourly Rate (₦)</Label>
                <Input id="hourly_rate" type="number" placeholder="5000" {...register("hourly_rate", { valueAsNumber: true })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description / Requirements</Label>
                <Textarea id="description" placeholder="Describe care requirements, special needs, any relevant medical history..." rows={3} {...register("description")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                AI Staff Matching
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#64748B]">
                Fill in service type, duration, and location above, then run AI matching to find the best available professionals.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={runAiMatch}
                loading={aiMatching}
                disabled={!serviceType || !durationType || !location}
              >
                <Sparkles className="h-4 w-4" />
                Find Best Match with AI
              </Button>

              {aiMatches.length > 0 && (
                <div className="space-y-2">
                  {aiMatches.map((m) => (
                    <button
                      key={m.professional_id}
                      type="button"
                      onClick={() => setSelectedProfessionalId(
                        selectedProfessionalId === m.professional_id ? null : m.professional_id
                      )}
                      className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                        selectedProfessionalId === m.professional_id
                          ? "border-[#0F4C81] bg-[#EBF4FF]"
                          : "border-[#E2E8F0] hover:border-[#0F4C81]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-[#0F172A]">{m.name}</p>
                        <span className={`text-sm font-bold ${m.match_score >= 80 ? "text-[#22C55E]" : m.match_score >= 60 ? "text-[#F59E0B]" : "text-red-500"}`}>
                          {m.match_score}% match
                        </span>
                      </div>
                      <ul className="flex flex-wrap gap-1.5">
                        {m.match_reasons.map((r, i) => (
                          <li key={i} className="text-xs px-2 py-0.5 bg-[#F1F5F9] rounded-full text-[#374151]">{r}</li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting} className="flex-1 sm:flex-none sm:min-w-[160px]">
              Create Assignment
            </Button>
            <Link href="/assignments">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
