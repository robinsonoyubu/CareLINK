import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { loadProvider } from "@/components/medlink/provider-directory";
import { ProviderHeader, ReviewsList } from "@/components/medlink/provider-header";
import { ServiceBookingForm } from "@/components/medlink/service-booking-form";

export default async function DiagnosticProviderPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ test?: string }>;
}) {
  const { id } = await params;
  const { test } = await searchParams;
  const data = await loadProvider("diagnostic", id);
  if (!data) notFound();
  const { provider, services, reviews } = data;

  return (
    <div className="animate-fade-in">
      <Header title={provider.name} subtitle="Diagnostic provider" />
      <div className="p-4 md:p-6 space-y-5 max-w-4xl">
        <Link href="/diagnostics" className="inline-flex items-center gap-1 text-sm text-[#64748B] hover:text-[#0F4C81]"><ChevronLeft className="h-4 w-4" />All diagnostic providers</Link>
        <ProviderHeader provider={provider} chatLabel="Chat with Diagnostic Provider" phone={provider.phone} />
        <section aria-labelledby="book-h" className="space-y-2">
          <h3 id="book-h" className="text-sm font-semibold text-[#0F172A]">Book a test</h3>
          <ServiceBookingForm kind="diagnostic" providerId={provider.id} services={services}
            initialServiceId={services.some((s) => s.id === test) ? test : undefined} />
        </section>
        <ReviewsList reviews={reviews} />
      </div>
    </div>
  );
}
