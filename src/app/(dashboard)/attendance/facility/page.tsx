import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { FacilityConsole } from "@/components/attendance/facility-console";
import { cn } from "@/lib/utils";

export const metadata = { title: "Facility Attendance" };

export default async function FacilityAttendancePage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const service = await createServiceClient();
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    profile?.role === "admin"
      ? service.from("organizations").select("id, name").order("name")
      : service.from("organizations").select("id, name").eq("profile_id", user.id),
    service.from("organization_members").select("organization_id, member_role, organization:organizations(id, name)").eq("profile_id", user.id),
  ]);
  const orgs = new Map<string, { id: string; name: string; isOrgAdmin: boolean }>();
  for (const o of owned ?? []) orgs.set(o.id, { id: o.id, name: o.name, isOrgAdmin: true });
  for (const m of (memberships ?? []) as unknown as { member_role: string; organization: { id: string; name: string } | null }[]) {
    if (!m.organization) continue;
    const existing = orgs.get(m.organization.id);
    orgs.set(m.organization.id, { ...m.organization, isOrgAdmin: (existing?.isOrgAdmin ?? false) || m.member_role === "org_admin" });
  }
  const list = [...orgs.values()];
  if (list.length === 0) redirect("/dashboard");
  const current = list.find((o) => o.id === org) ?? list[0];

  return (
    <div className="animate-fade-in">
      <Header title="Facility Attendance" subtitle={`${current.name} · Dynamic QR + geofence + facial verification`} />
      <div className="p-4 md:p-6 space-y-4">
        {list.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Facility">
            {list.map((o) => (
              <Link key={o.id} href={`/attendance/facility?org=${o.id}`}
                className={cn("rounded-full px-3 py-1 text-sm", o.id === current.id ? "bg-[#0F4C81] text-white" : "bg-white border border-[#E2E8F0]")}>{o.name}</Link>
            ))}
          </nav>
        )}
        <FacilityConsole key={current.id} orgId={current.id} isOrgAdmin={current.isOrgAdmin} />
      </div>
    </div>
  );
}
