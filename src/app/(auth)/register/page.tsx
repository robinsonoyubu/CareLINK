"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Stethoscope, Building2, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "professional", label: "Healthcare Professional", description: "Nurse, Caregiver, Physiotherapist, Doctor", icon: Stethoscope },
  { value: "organization", label: "Organization", description: "Hospital, Clinic, HMO, NGO", icon: Building2 },
  { value: "client", label: "Home-Care Client", description: "Family or individual requiring care", icon: Heart },
];

const professionOptions = [
  { value: "nurse", label: "Nurse" },
  { value: "nurse_assistant", label: "Nurse Assistant" },
  { value: "caregiver", label: "Caregiver" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "doctor", label: "Doctor" },
];

const orgTypeOptions = [
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "hmo", label: "HMO" },
  { value: "ngo", label: "NGO" },
  { value: "school", label: "School" },
  { value: "nursing_home", label: "Nursing Home" },
];

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    // professional fields
    profession: "",
    years_of_experience: "",
    // org fields
    org_name: "",
    org_type: "",
    registration_number: "",
    website: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // 1. Create auth user (triggers profile creation via DB function)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: selectedRole },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Update phone on profile if provided
    if (authData.user && form.phone) {
      await supabase.from("profiles").update({ phone: form.phone }).eq("id", authData.user.id);
    }

    // 2. Create role-specific record via API route (uses service role key)
    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: selectedRole,
        profession: form.profession || undefined,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : undefined,
        org_name: form.org_name || undefined,
        org_type: form.org_type || undefined,
        registration_number: form.registration_number || undefined,
        website: form.website || undefined,
        contact_person: form.full_name,
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to complete profile setup");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-lg shadow-2xl border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-[#0F172A]">Create account</CardTitle>
        <CardDescription className="text-[#64748B]">
          Join the careLINK platform — choose your account type
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Role selector */}
        <div className="mb-6 grid grid-cols-1 gap-2.5">
          {roleOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedRole(opt.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all",
                  selectedRole === opt.value
                    ? "border-[#0F4C81] bg-[#EBF4FF]"
                    : "border-[#E2E8F0] hover:border-[#0F4C81]/40 hover:bg-[#F8FAFC]"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
                  selectedRole === opt.value ? "bg-[#0F4C81] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", selectedRole === opt.value ? "text-[#0F4C81]" : "text-[#0F172A]")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-[#64748B]">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Common fields */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name">
                {selectedRole === "organization" ? "Contact Person Name" : "Full Name"}
              </Label>
              <Input
                id="full_name"
                placeholder="John Adeyemi"
                autoComplete="name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Professional-specific fields */}
            {selectedRole === "professional" && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#F1F5F9]">
                <div className="space-y-1.5">
                  <Label>Profession</Label>
                  <Select value={form.profession} onValueChange={(v) => setForm({ ...form, profession: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select profession" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="years_exp">Years of Experience</Label>
                  <Input
                    id="years_exp"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={form.years_of_experience}
                    onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Organization-specific fields */}
            {selectedRole === "organization" && (
              <div className="space-y-4 pt-2 border-t border-[#F1F5F9]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="org_name">Organization Name</Label>
                    <Input
                      id="org_name"
                      placeholder="Lagos General Hospital"
                      value={form.org_name}
                      onChange={(e) => setForm({ ...form, org_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Organization Type</Label>
                    <Select value={form.org_type} onValueChange={(v) => setForm({ ...form, org_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {orgTypeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg_number">Registration Number <span className="text-[#94A3B8]">(optional)</span></Label>
                  <Input
                    id="reg_number"
                    placeholder="RC-1234567"
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? "Creating account..." : "Create account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            <p className="text-xs text-center text-[#64748B]">
              By registering, you agree to RAFFATI&apos;s{" "}
              <Link href="/terms" className="text-[#0F4C81] hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-[#0F4C81] hover:underline">Privacy Policy</Link>
            </p>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-[#64748B]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#0F4C81] font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
