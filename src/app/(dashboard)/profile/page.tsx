import type { ComponentProps } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { AccountSettings } from "@/components/profile/account-settings";
import { PrivacySettings } from "@/components/profile/privacy-settings";
import { CalendarSettings } from "@/components/profile/calendar-settings";
import { ProfessionalApplication } from "@/components/profile/professional-application";
import { isCalendarConfigured } from "@/lib/medlink/google-calendar";
import { cn } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string; calendar?: string }> }) {
  const { tab = "account", calendar } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isProfessional = profile?.role === "professional";

  const tabs = [
    { key: "account", label: "Account" },
    ...(isProfessional ? [{ key: "application", label: "Registration & verification" }] : []),
    { key: "privacy", label: "Privacy" },
    { key: "calendar", label: "Calendar Integration" },
    { key: "rewards", label: "Rewards" },
  ];

  let body: React.ReactNode = <AccountSettings />;
  if (tab === "privacy") {
    const { data } = await supabase.from("privacy_consents").select("consent, granted").eq("profile_id", user.id);
    body = <PrivacySettings consents={Object.fromEntries((data ?? []).map((c) => [c.consent, c.granted]))} />;
  } else if (tab === "calendar") {
    const service = await createServiceClient();
    const { data } = await service.from("calendar_integrations").select("google_email").eq("profile_id", user.id).maybeSingle();
    body = (
      <div className="space-y-3">
        {calendar === "connected" && <p className="max-w-2xl rounded-md bg-green-50 p-2 text-sm text-green-800">Google Calendar connected.</p>}
        {calendar && calendar !== "connected" && <p className="max-w-2xl rounded-md bg-red-50 p-2 text-sm text-red-800">Google Calendar was not connected.</p>}
        <CalendarSettings configured={isCalendarConfigured()} connected={!!data} connectedEmail={data?.google_email ?? null} />
      </div>
    );
  } else if (tab === "rewards") {
    body = <p className="text-sm text-[#64748B]">Your coin wallet, OPay payout account and withdrawal history live in <Link className="text-[#0F4C81] underline" href="/earn">Earn</Link>.</p>;
  } else if (tab === "application" && isProfessional) {
    const { data: pro } = await supabase.from("professionals").select("id, profession, marital_status, application_status, rejection_reason").eq("profile_id", user.id).single();
    if (pro) {
      const [{ data: cred }, { data: g }] = await Promise.all([
        supabase.from("professional_credentials").select("*").eq("professional_id", pro.id).maybeSingle(),
        supabase.from("guarantors").select("*").eq("professional_id", pro.id).limit(1).maybeSingle(),
      ]);
      body = <ProfessionalApplication professionalId={pro.id} profession={pro.profession} maritalStatus={pro.marital_status}
        status={pro.application_status} rejectionReason={pro.rejection_reason}
        credentials={cred as ComponentProps<typeof ProfessionalApplication>["credentials"]} guarantor={g} />;
    }
  }

  return (
    <div className="animate-fade-in">
      <Header title="Profile" subtitle="Account, settings, privacy and calendar" />
      <div className="p-4 md:p-6 space-y-4">
        <nav className="flex flex-wrap gap-2" aria-label="Profile sections">
          {tabs.map((t) => (
            <Link key={t.key} href={`/profile?tab=${t.key}`} aria-current={t.key === tab ? "page" : undefined}
              className={cn("rounded-full px-3 py-1 text-sm", t.key === tab ? "bg-[#0F4C81] text-white" : "bg-white border border-[#E2E8F0]")}>{t.label}</Link>
          ))}
        </nav>
        {body}
      </div>
    </div>
  );
}
