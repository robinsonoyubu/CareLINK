"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookingStatusBadge, PaymentStatusBadge } from "./badges";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Kind = "hospital" | "diagnostic" | "pharmacy" | "ambulance";
type Service = { id: string; category: string; name: string; description: string | null; price: number | null; requires_payment: boolean; strength: string | null; requires_prescription: boolean; in_stock: boolean; home_collection: boolean; turnaround_hours: number | null; vehicle_type: string | null; equipment: string[]; is_available: boolean; is_active: boolean };
type Booking = { id: string; reference: string; status: string; payment_status: string; is_emergency: boolean; scheduled_at: string | null; created_at: string; amount: number | null; patient_details: { full_name?: string } };

const CATEGORY: Record<Kind, Service["category"]> = { hospital: "department", diagnostic: "test", pharmacy: "product", ambulance: "vehicle" };
const ITEM_LABEL: Record<Kind, string> = { hospital: "department / service", diagnostic: "test", pharmacy: "product", ambulance: "vehicle" };

export function ProviderConsole({ provider }: { provider: Record<string, unknown> & { id: string; kind: Kind; name: string } }) {
  const supabase = createClient();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const kind = provider.kind;

  const load = useCallback(async () => {
    const [s, b] = await Promise.all([
      supabase.from("provider_services").select("*").eq("provider_id", provider.id).order("name"),
      supabase.from("bookings").select("id, reference, status, payment_status, is_emergency, scheduled_at, created_at, amount, patient_details")
        .eq("provider_id", provider.id).order("is_emergency", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    ]);
    setServices((s.data ?? []) as Service[]);
    setBookings((b.data ?? []) as Booking[]);
  }, [provider.id, supabase]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  // Live: new bookings (emergencies especially) appear without refresh.
  useEffect(() => {
    const ch = supabase.channel(`provider-bookings-${provider.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `provider_id=eq.${provider.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [provider.id, supabase, load]);

  const blank = { name: "", description: "", price: "", strength: "", requires_prescription: false, home_collection: false, turnaround_hours: "", vehicle_type: "basic_life_support", equipment: "" };
  const [form, setForm] = useState(blank);
  async function addService() {
    const { error } = await supabase.from("provider_services").insert({
      provider_id: provider.id, category: CATEGORY[kind], name: form.name.trim(), description: form.description.trim() || null,
      price: form.price ? Number(form.price) : null, requires_payment: !!form.price,
      strength: kind === "pharmacy" ? form.strength.trim() || null : null,
      requires_prescription: kind === "pharmacy" && form.requires_prescription,
      home_collection: kind === "diagnostic" && form.home_collection,
      turnaround_hours: kind === "diagnostic" && form.turnaround_hours ? Number(form.turnaround_hours) : null,
      vehicle_type: kind === "ambulance" ? form.vehicle_type : null,
      equipment: kind === "ambulance" ? form.equipment.split(",").map((e) => e.trim()).filter(Boolean) : [],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Added"); setForm(blank); load();
  }
  async function patch(id: string, p: Partial<Service>) {
    const { error } = await supabase.from("provider_services").update(p).eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  const [details, setDetails] = useState({
    description: (provider.description as string) ?? "", phone: (provider.phone as string) ?? "", emergency_phone: (provider.emergency_phone as string) ?? "",
    service_area: (provider.service_area as string) ?? "", bank_name: (provider.bank_name as string) ?? "",
    bank_account_name: (provider.bank_account_name as string) ?? "", bank_account_number: (provider.bank_account_number as string) ?? "",
    offers_home_collection: !!provider.offers_home_collection,
  });
  async function saveDetails() {
    const { error } = await supabase.from("service_providers").update({ ...details }).eq("id", provider.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  const shown = filter === "open" ? bookings.filter((b) => !["completed", "cancelled", "declined"].includes(b.status)) : bookings;

  return (
    <Tabs defaultValue="bookings" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="bookings">{kind === "pharmacy" ? "Orders" : "Bookings"}</TabsTrigger>
        <TabsTrigger value="catalogue">{kind === "pharmacy" ? "Products" : kind === "diagnostic" ? "Tests & prices" : kind === "ambulance" ? "Vehicles" : "Departments"}</TabsTrigger>
        <TabsTrigger value="details">Details & payments</TabsTrigger>
      </TabsList>

      <TabsContent value="bookings" className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "open" ? "default" : "outline"} onClick={() => setFilter("open")}>Open</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
        {shown.length === 0 && <p className="py-8 text-center text-sm text-[#64748B]">Nothing here.</p>}
        {shown.map((b) => (
          <Link key={b.id} href={`/bookings/${b.id}`} className="block">
            <Card className={b.is_emergency ? "border-2 border-red-500" : ""}><CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {b.is_emergency && <span className="mr-2 font-bold text-red-600">EMERGENCY</span>}
                <span className="font-mono">{b.reference}</span> · {b.patient_details?.full_name ?? "Patient"}
                <span className="block text-xs text-[#64748B]">{b.scheduled_at ? formatDateTime(b.scheduled_at) : `Received ${formatDateTime(b.created_at)}`}{b.amount != null && ` · ${formatCurrency(Number(b.amount))}`}</span>
              </span>
              <span className="flex gap-2"><PaymentStatusBadge status={b.payment_status} /><BookingStatusBadge status={b.status} /></span>
            </CardContent></Card>
          </Link>
        ))}
      </TabsContent>

      <TabsContent value="catalogue" className="space-y-3">
        <Card><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <div className="space-y-1 sm:col-span-2"><Label>New {ITEM_LABEL[kind]}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Price (₦){kind === "hospital" && " — blank if pay at hospital"}</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          {kind === "pharmacy" && <div className="space-y-1"><Label>Strength</Label><Input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} /></div>}
          {kind === "diagnostic" && <div className="space-y-1"><Label>Turnaround (hours)</Label><Input type="number" value={form.turnaround_hours} onChange={(e) => setForm({ ...form, turnaround_hours: e.target.value })} /></div>}
          {kind === "ambulance" && <div className="space-y-1"><Label>Type</Label>
            <select className="flex h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
              <option value="basic_life_support">Basic Life Support</option><option value="advanced_life_support">Advanced Life Support</option><option value="patient_transport">Patient Transport</option><option value="neonatal">Neonatal</option><option value="other">Other</option>
            </select></div>}
          <div className="space-y-1 sm:col-span-3"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {kind === "ambulance" && <div className="space-y-1 sm:col-span-4"><Label>Equipment (comma-separated)</Label><Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} /></div>}
          {kind === "pharmacy" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requires_prescription} onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })} />Prescription required</label>}
          {kind === "diagnostic" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.home_collection} onChange={(e) => setForm({ ...form, home_collection: e.target.checked })} />Home collection</label>}
          <Button disabled={form.name.trim().length < 2} onClick={addService}>Add</Button>
        </CardContent></Card>
        {services.map((s) => (
          <div key={s.id} className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm flex flex-wrap items-center justify-between gap-2">
            <span className={s.is_active ? "" : "opacity-50"}>{s.name}{s.strength && ` ${s.strength}`}
              <span className="block text-xs text-[#64748B]">{s.price != null ? formatCurrency(Number(s.price)) : "No price"}{s.requires_prescription && " · Rx"}{s.home_collection && " · home collection"}{s.vehicle_type && ` · ${s.vehicle_type.replace(/_/g, " ")}`}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Input type="number" defaultValue={s.price ?? ""} className="h-9 w-28" aria-label={`Price for ${s.name}`}
                onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== s.price) patch(s.id, { price: v, requires_payment: v != null }); }} />
              {kind === "pharmacy" && <Button size="sm" variant="outline" onClick={() => patch(s.id, { in_stock: !s.in_stock })}>{s.in_stock ? "In stock" : "Out of stock"}</Button>}
              {kind === "ambulance" && <Button size="sm" variant="outline" onClick={() => patch(s.id, { is_available: !s.is_available })}>{s.is_available ? "Available" : "Unavailable"}</Button>}
              <Button size="sm" variant="ghost" onClick={() => patch(s.id, { is_active: !s.is_active })}>{s.is_active ? "Hide" : "Show"}</Button>
            </span>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="details">
        <Card><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2"><Label>Description</Label><Input value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} /></div>
          <div className="space-y-1"><Label>Phone</Label><Input value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></div>
          {kind === "ambulance" && <div className="space-y-1"><Label>Emergency line</Label><Input value={details.emergency_phone} onChange={(e) => setDetails({ ...details, emergency_phone: e.target.value })} /></div>}
          {kind === "ambulance" && <div className="space-y-1"><Label>Service area</Label><Input value={details.service_area} onChange={(e) => setDetails({ ...details, service_area: e.target.value })} /></div>}
          {kind === "diagnostic" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={details.offers_home_collection} onChange={(e) => setDetails({ ...details, offers_home_collection: e.target.checked })} />We offer home collection</label>}
          <p className="sm:col-span-2 pt-2 text-sm font-medium">Bank transfer details shown to customers</p>
          <div className="space-y-1"><Label>Bank</Label><Input value={details.bank_name} onChange={(e) => setDetails({ ...details, bank_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Account name</Label><Input value={details.bank_account_name} onChange={(e) => setDetails({ ...details, bank_account_name: e.target.value })} /></div>
          <div className="space-y-1"><Label>Account number</Label><Input inputMode="numeric" value={details.bank_account_number} onChange={(e) => setDetails({ ...details, bank_account_number: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="sm:col-span-2 flex justify-end"><Button onClick={saveDetails}>Save details</Button></div>
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}
