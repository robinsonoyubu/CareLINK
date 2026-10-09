import Link from "next/link";
import { MapPin, Search, Truck, Home as HomeIcon, Siren } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RghVerifiedBadge, RatingSummary, ResponseTime } from "./badges";

export type ProviderKind = "hospital" | "diagnostic" | "pharmacy" | "ambulance";

export interface ProviderRow {
  id: string;
  kind: ProviderKind;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  is_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  avg_response_minutes: number | null;
  response_sample_size: number;
  offers_home_collection: boolean;
  service_area: string | null;
  is_emergency_partner: boolean;
}

const BASE: Record<ProviderKind, string> = {
  hospital: "/hospitals",
  diagnostic: "/diagnostics",
  pharmacy: "/pharmacy",
  ambulance: "/ambulance",
};

const EMPTY: Record<ProviderKind, string> = {
  hospital: "No hospitals are listed yet.",
  diagnostic: "No diagnostic providers are listed yet.",
  pharmacy: "No pharmacies are listed yet.",
  ambulance: "No ambulance or paramedic partners are listed yet.",
};

export async function ProviderDirectory({ kind, q, city }: { kind: ProviderKind; q?: string; city?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("service_providers")
    .select("id, kind, name, description, address, city, state, is_verified, rating_avg, rating_count, avg_response_minutes, response_sample_size, offers_home_collection, service_area, is_emergency_partner")
    .eq("kind", kind)
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .limit(60);
  const term = q?.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  if (city?.trim()) query = query.ilike("city", `%${city.trim().replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const providers = (data ?? []) as ProviderRow[];

  return (
    <div className="space-y-4">
      <form className="flex flex-col sm:flex-row gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search by name or service" className="pl-9" aria-label="Search" />
        </div>
        <Input name="city" defaultValue={city} placeholder="City (e.g. Ikeja)" className="sm:w-48" aria-label="City" />
        <Button type="submit">Search</Button>
      </form>

      {providers.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#64748B]">{term || city ? "No matches. Try a different search." : EMPTY[kind]}</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {providers.map((p) => (
            <li key={p.id}>
              <Link href={`${BASE[kind]}/${p.id}`} className="block h-full">
                <Card className="h-full hover:shadow-md hover:border-[#0F4C81]/30 transition">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[#0F172A]">{p.name}</h3>
                      {p.is_verified && <RghVerifiedBadge className="flex-shrink-0" />}
                    </div>
                    {p.description && <p className="text-sm text-[#64748B] line-clamp-2">{p.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                      {(p.city || p.address) && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[p.city, p.state].filter(Boolean).join(", ") || p.address}</span>
                      )}
                      <RatingSummary avg={p.rating_avg} count={p.rating_count} />
                      <ResponseTime minutes={p.avg_response_minutes} sample={p.response_sample_size} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {kind === "diagnostic" && p.offers_home_collection && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4FF] px-2 py-0.5 text-xs text-[#0F4C81]"><HomeIcon className="h-3 w-3" />Home collection</span>
                      )}
                      {kind === "ambulance" && p.is_emergency_partner && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700"><Siren className="h-3 w-3" />Emergency partner</span>
                      )}
                      {kind === "ambulance" && p.service_area && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#374151]"><Truck className="h-3 w-3" />{p.service_area}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Loads one active provider with its catalogue. Returns null when not found. */
export async function loadProvider(kind: ProviderKind, id: string) {
  const supabase = await createClient();
  const { data: provider } = await supabase.from("service_providers").select("*").eq("id", id).eq("kind", kind).maybeSingle();
  if (!provider) return null;
  const [{ data: services }, { data: doctors }, { data: reviews }] = await Promise.all([
    supabase.from("provider_services").select("*").eq("provider_id", id).eq("is_active", true).order("name"),
    kind === "hospital"
      ? supabase.from("provider_doctors").select("id, full_name, specialty, department_id").eq("provider_id", id).eq("is_active", true).order("full_name")
      : Promise.resolve({ data: [] }),
    supabase.from("reviews").select("id, rating, comment, criteria, created_at").eq("provider_id", id).eq("is_hidden", false)
      .order("created_at", { ascending: false }).limit(5),
  ]);
  return {
    provider: provider as ProviderRow & { phone: string | null; emergency_phone: string | null; email: string | null },
    services: (services ?? []) as ServiceRow[],
    doctors: (doctors ?? []) as { id: string; full_name: string; specialty: string | null; department_id: string | null }[],
    reviews: (reviews ?? []) as { id: string; rating: number; comment: string | null; created_at: string }[],
  };
}

export interface ServiceRow {
  id: string;
  provider_id: string;
  category: "department" | "test" | "product" | "vehicle" | "service";
  name: string;
  description: string | null;
  price: number | null;
  requires_payment: boolean;
  strength: string | null;
  requires_prescription: boolean;
  in_stock: boolean;
  home_collection: boolean;
  turnaround_hours: number | null;
  vehicle_type: string | null;
  equipment: string[];
  is_available: boolean;
}
