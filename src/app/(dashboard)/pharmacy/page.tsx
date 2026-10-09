import { Header } from "@/components/layout/header";
import { ProviderDirectory } from "@/components/medlink/provider-directory";
import { PrescriptionWarning } from "@/components/medlink/pharmacy-store";

export const metadata = { title: "Pharmacy" };

export default async function PharmacyPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string }> }) {
  const { q, city } = await searchParams;
  return (
    <div className="animate-fade-in">
      <Header title="Pharmacy" subtitle="Order medicines and chat with a pharmacist" />
      <div className="p-4 md:p-6 space-y-4">
        <PrescriptionWarning />
        <ProviderDirectory kind="pharmacy" q={q} city={city} />
      </div>
    </div>
  );
}
