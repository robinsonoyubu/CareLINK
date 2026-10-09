import { Header } from "@/components/layout/header";
import { ProviderDirectory } from "@/components/medlink/provider-directory";

export const metadata = { title: "Hospitals" };

export default async function HospitalsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string }> }) {
  const { q, city } = await searchParams;
  return (
    <div className="animate-fade-in">
      <Header title="Hospitals" subtitle="Book appointments by department, service or doctor" />
      <div className="p-4 md:p-6"><ProviderDirectory kind="hospital" q={q} city={city} /></div>
    </div>
  );
}
