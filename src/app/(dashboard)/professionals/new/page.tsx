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
import { registerProfessionalSchema, type RegisterProfessionalInput } from "@/validations";
import type { Resolver } from "react-hook-form";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";

export default function NewProfessionalPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<RegisterProfessionalInput>({
    resolver: zodResolver(registerProfessionalSchema) as Resolver<RegisterProfessionalInput>,
    defaultValues: { years_of_experience: 1 },
  });

  async function onSubmit(data: RegisterProfessionalInput) {
    setError(null);
    const supabase = createClient();

    // 1. Create auth user (admin registers on behalf)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { role: "professional", full_name: data.full_name } },
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message ?? "Failed to create account");
      return;
    }

    // Profile is created by trigger; insert professional record
    const { error: proError } = await supabase.from("professionals").insert({
      profile_id: authData.user.id,
      profession: data.profession,
      specialty: data.specialty ?? null,
      years_of_experience: data.years_of_experience,
      bio: data.bio ?? null,
      workforce_status: "available",
      is_verified: false,
    });

    if (proError) {
      setError(proError.message);
      return;
    }

    router.push("/workforce");
  }

  return (
    <div className="animate-fade-in">
      <Header title="Register Professional" subtitle="Onboard a new healthcare professional" />

      <div className="p-6 max-w-2xl space-y-6">
        <Link href="/workforce" className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A]">
          <ArrowLeft className="h-4 w-4" /> Back to Workforce
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" placeholder="Chidinma Okonkwo" error={errors.full_name?.message} {...register("full_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" type="tel" placeholder="+234 800 000 0000" error={errors.phone?.message} {...register("phone")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="chidinma@example.com" error={errors.email?.message} {...register("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input id="password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register("password")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Professional Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Profession *</Label>
                  <Controller
                    name="profession"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="nurse_assistant">Nurse Assistant</SelectItem>
                          <SelectItem value="caregiver">Caregiver</SelectItem>
                          <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                          <SelectItem value="doctor">Doctor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="years_of_experience">Years of Experience *</Label>
                  <Input id="years_of_experience" type="number" min={0} max={50} {...register("years_of_experience", { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specialty">Specialty</Label>
                <Input id="specialty" placeholder="e.g. Paediatric Care, ICU, Orthopaedics" {...register("specialty")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio / Summary</Label>
                <Textarea id="bio" placeholder="Professional background, key skills, career highlights..." rows={3} {...register("bio")} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting} className="flex-1 sm:flex-none sm:min-w-[180px]">
              <UserPlus className="h-4 w-4" />
              Register Professional
            </Button>
            <Link href="/workforce">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
