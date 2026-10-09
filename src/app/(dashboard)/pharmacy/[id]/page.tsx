import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { loadProvider } from "@/components/medlink/provider-directory";
import { ProviderHeader, ReviewsList } from "@/components/medlink/provider-header";
import { PharmacyStore } from "@/components/medlink/pharmacy-store";

export default async function PharmacyStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProvider("pharmacy", id);
  if (!data) notFound();
  const { provider, services, reviews } = data;

  return (
    <div className="animate-fade-in">
      <Header title={provider.name} subtitle="Pharmacy" />
      <div className="p-4 md:p-6 space-y-5">
        <Link href="/pharmacy" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />All pharmacies</Link>
        <ProviderHeader provider={provider} chatLabel="Chat with Pharmacist" phone={provider.phone} />
        <PharmacyStore providerId={provider.id} products={services.filter((s) => s.category === "product")} />
        <ReviewsList reviews={reviews} />
      </div>
    </div>
  );
}
