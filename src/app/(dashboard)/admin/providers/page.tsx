import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RghVerifiedBadge } from "@/components/medlink/badges";
import { ProviderOnboardForm, ProviderVerifyToggle } from "@/components/admin/admin-actions";
import { requireRghAdmin } from "@/lib/medlink/admin";

export const metadata = { title: "Providers" };

export default async function AdminProvidersPage() {
  const { supabase } = await requireRghAdmin();
  const { data } = await supabase.from("service_providers").select("id, kind, name, city, is_verified, is_active, rating_avg, rating_count").order("kind").order("name");

  return (
    <div className="animate-fade-in">
      <Header title="Providers" subtitle="Hospitals, diagnostics, pharmacies and ambulance/paramedic partners" />
      <div className="p-4 md:p-6 space-y-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">Onboard a provider</CardTitle></CardHeader><CardContent><ProviderOnboardForm /></CardContent></Card>
        <div className="space-y-2">
          {(data ?? []).map((p) => (
            <div key={p.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <span className={p.is_active ? "" : "opacity-50"}>{p.name} {p.is_verified && <RghVerifiedBadge />}<span className="block text-xs text-[#64748B] capitalize">{p.kind} · {p.city ?? "—"} · {p.rating_count} ratings</span></span>
              <ProviderVerifyToggle id={p.id} verified={p.is_verified} active={p.is_active} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
