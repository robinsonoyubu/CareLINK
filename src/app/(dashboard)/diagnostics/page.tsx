import { Header } from "@/components/layout/header";
import { ProviderDirectory } from "@/components/medlink/provider-directory";

export const metadata = { title: "Diagnostics" };

export default async function DiagnosticsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string }> }) {
  const { q, city } = await searchParams;
  return (
    <div className="animate-fade-in">
      <Header title="Diagnostics" subtitle="Lab tests and scans — in-centre or home collection where offered" />
      <div className="p-4 md:p-6"><ProviderDirectory kind="diagnostic" q={q} city={city} /></div>
    </div>
  );
}
