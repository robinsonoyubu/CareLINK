"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Siren, Phone, LocateFixed, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { distanceMeters } from "@/lib/attendance/geofence";

type Partner = { id: string; name: string; lat: number | null; lng: number | null; emergency_phone: string | null; phone: string | null };

/**
 * Emergency → Location → Essential details → Partner request → Dispatch.
 * Deliberately short: no payment, chat or long forms stand between the user and help.
 */
export function EmergencyRequest({ partners }: { partners: Partner[] }) {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [phone, setPhone] = useState("");
  const [what, setWhat] = useState("");
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ id: string; reference: string; phone: string | null; partner: string } | null>(null);

  function locate() {
    if (!navigator.geolocation) { toast.error("Location is not available on this device. Type the address."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!address) setAddress(`GPS ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      () => { setLocating(false); toast.error("Couldn't get your location. Type the address."); },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  function pickPartner() {
    if (!coords) return partners[0];
    const located = partners.filter((p) => p.lat != null && p.lng != null);
    if (!located.length) return partners[0];
    return located.sort((a, b) => distanceMeters(coords, { lat: a.lat!, lng: a.lng! }) - distanceMeters(coords, { lat: b.lat!, lng: b.lng! }))[0];
  }

  async function send() {
    const partner = pickPartner();
    if (!partner) { toast.error("No emergency partner is available. Call 112 now."); return; }
    setSending(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "ambulance", is_emergency: true, provider_id: partner.id,
        pickup_address: address.trim(), pickup_lat: coords?.lat, pickup_lng: coords?.lng,
        patient: { phone: phone.trim(), ...(what.trim() ? { condition: what.trim() } : {}) },
      }),
    });
    const data = (await res.json()) as { id?: string; reference?: string; emergency_phone?: string | null; error?: unknown };
    setSending(false);
    if (!res.ok || !data.id) { toast.error("Request failed — call the number below or 112 now."); return; }
    setSent({ id: data.id, reference: data.reference!, phone: data.emergency_phone ?? partner.emergency_phone ?? partner.phone, partner: partner.name });
  }

  const fallbackPhone = partners[0]?.emergency_phone ?? partners[0]?.phone;

  if (sent) {
    return (
      <div className="rounded-xl border-2 border-red-600 bg-red-50 p-5 space-y-3" role="status" aria-live="assertive">
        <p className="flex items-center gap-2 font-semibold text-red-800"><CheckCircle2 className="h-5 w-5" />Emergency request sent to {sent.partner}</p>
        <p className="text-sm text-red-900">Reference {sent.reference}. Keep your phone ({phone}) free — the team will call you.</p>
        <div className="flex flex-wrap gap-2">
          {sent.phone && <a href={`tel:${sent.phone}`}><Button className="bg-red-600 hover:bg-red-700"><Phone className="h-4 w-4" />Call {sent.partner}</Button></a>}
          <a href="tel:112"><Button variant="outline">Call 112</Button></a>
          <Link href={`/bookings/${sent.id}`}><Button variant="outline">Track dispatch</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border-2 border-red-600 bg-red-50 p-5 space-y-4" aria-labelledby="emg-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="emg-h" className="flex items-center gap-2 text-lg font-bold text-red-800"><Siren className="h-5 w-5" />Emergency</h2>
        <div className="flex gap-2">
          <a href="tel:112"><Button size="sm" className="bg-red-700 hover:bg-red-800"><Phone className="h-4 w-4" />Call 112</Button></a>
          {fallbackPhone && <a href={`tel:${fallbackPhone}`}><Button size="sm" variant="outline">Call partner</Button></a>}
        </div>
      </div>
      <p className="text-sm text-red-900">If someone is in immediate danger, call now. You can also send a request below — it takes seconds.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="emg-addr">Where are you?</Label>
          <div className="flex gap-2">
            <Input id="emg-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address or landmark" className="bg-white" />
            <Button type="button" variant="outline" loading={locating} onClick={locate} aria-label="Use my location"><LocateFixed className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="emg-phone">Phone to reach you</Label>
          <Input id="emg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white" autoComplete="tel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emg-what">What&apos;s happening? (optional)</Label>
          <Input id="emg-what" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. unconscious, bleeding, labour" className="bg-white" />
        </div>
      </div>
      <Button size="lg" className="w-full bg-red-600 hover:bg-red-700 text-base" loading={sending}
        disabled={address.trim().length < 3 || phone.trim().length < 7 || partners.length === 0} onClick={send}>
        <Siren className="h-5 w-5" /> Request emergency help now
      </Button>
      {partners.length === 0 && <p className="text-sm font-medium text-red-800">No emergency partner is online in MedLINK yet — call 112.</p>}
    </section>
  );
}
