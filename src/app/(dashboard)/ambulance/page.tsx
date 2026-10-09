import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import { ProviderDirectory } from "@/components/medlink/provider-directory";
import { EmergencyRequest } from "@/components/medlink/emergency-request";

export const metadata = { title: "Ambulance & Paramedics" };

export default async function AmbulancePage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string }> }) {
  const { q, city } = await searchParams;
  const supabase = await createClient();
  const { data: partners } = await supabase
    .from("service_providers")
    .select("id, name, lat, lng, emergency_phone, phone")
    .eq("kind", "ambulance").eq("is_active", true).eq("is_emergency_partner", true)
    .order("is_verified", { ascending: false });

  return (
    <div className="animate-fade-in">
      <Header title="Ambulance & Paramedics" subtitle="Emergency response and scheduled patient transport" />
      <div className="p-4 md:p-6 space-y-6">
        <EmergencyRequest partners={partners ?? []} />
        <section className="space-y-3" aria-labelledby="nonemg-h">
          <h2 id="nonemg-h" className="text-base font-semibold text-[#0F172A]">Book non-emergency transport</h2>
          <p className="text-sm text-[#64748B]">Chat with partners is for non-time-critical questions only. Never use chat in an emergency.</p>
          <ProviderDirectory kind="ambulance" q={q} city={city} />
        </section>
      </div>
    </div>
  );
}
