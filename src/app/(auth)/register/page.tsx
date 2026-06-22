"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Stethoscope, Building2, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const roleOptions: { value: UserRole; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "professional", label: "Healthcare Professional", description: "Nurse, Caregiver, Physiotherapist, Doctor", icon: Stethoscope },
  { value: "organization", label: "Organization", description: "Hospital, Clinic, HMO, NGO", icon: Building2 },
  { value: "client", label: "Home-Care Client", description: "Family or individual requiring care", icon: Heart },
];

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, role: selectedRole },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
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

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
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
