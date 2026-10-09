import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { loadProvider } from "@/components/medlink/provider-directory";
import { ProviderHeader, ReviewsList } from "@/components/medlink/provider-header";
import { AmbulanceBookingForm } from "@/components/medlink/ambulance-booking-form";

export default async function AmbulancePartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadProvider("ambulance", id);
  if (!data) notFound();
  const { provider, services, reviews } = data;

  return (
    <div className="animate-fade-in">
      <Header title={provider.name} subtitle={provider.service_area ? `Service area: ${provider.service_area}` : "Ambulance & paramedic partner"} />
      <div className="p-4 md:p-6 space-y-5 max-w-4xl">
        <Link href="/ambulance" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />Ambulance & Paramedics</Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Emergency? Don&apos;t book here — use <Link href="/ambulance" className="font-semibold underline">Emergency</Link> or call {provider.emergency_phone ?? "112"}.
        </div>
        <ProviderHeader provider={provider} chatLabel="Chat (non-urgent)" phone={provider.phone} />
        <AmbulanceBookingForm providerId={provider.id} vehicles={services.filter((s) => s.category === "vehicle")} />
        <ReviewsList reviews={reviews} />
      </div>
    </div>
  );
}
