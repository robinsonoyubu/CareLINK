"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { FileUpload } from "./file-upload";
import { ChatButton } from "./chat-button";
import { PatientFields, emptyPatient, isPatientValid, patientPayload } from "./patient-fields";
import type { ServiceRow } from "./provider-directory";

type Cart = Record<string, number>;
type DrugRequest = { name: string; strength: string; quantity: number; notes: string };

const emptyRequest: DrugRequest = { name: "", strength: "", quantity: 1, notes: "" };

function loadCart(key: string): Cart {
  try { return JSON.parse(localStorage.getItem(key) ?? "{}") as Cart; } catch { return {}; }
}
function saveCart(key: string, cart: Cart) {
  try { localStorage.setItem(key, JSON.stringify(cart)); } catch { /* storage unavailable */ }
}

export function PrescriptionWarning() {
  return (
    <div role="note" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
      <p>
        Certain drugs <strong>cannot be dispensed without a doctor&apos;s prescription</strong>. Upload a valid prescription
        for prescription-only items. The pharmacist will verify it before fulfilment. Chat with Pharmacist is not a substitute for a doctor consultation.
      </p>
    </div>
  );
}

export function PharmacyStore({ providerId, products }: { providerId: string; products: ServiceRow[] }) {
  const router = useRouter();
  const storageKey = `medlink-cart-${providerId}`;
  const [cart, setCart] = useState<Cart>({});
  const [filter, setFilter] = useState("");
  const [requests, setRequests] = useState<DrugRequest[]>([]);
  const [prescription, setPrescription] = useState<string | null>(null);
  const [patient, setPatient] = useState(emptyPatient);
  const [delivery, setDelivery] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Restore the cart after hydration (localStorage is browser-only).
    const restored = loadCart(storageKey);
    if (Object.keys(restored).length) queueMicrotask(() => setCart(restored));
  }, [storageKey]);

  function update(next: Cart) { setCart(next); saveCart(storageKey, next); }
  function setQty(id: string, qty: number) {
    const next = { ...cart };
    if (qty <= 0) delete next[id]; else next[id] = Math.min(qty, 100);
    update(next);
  }

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([id]) => byId.has(id)).map(([id, qty]) => ({ product: byId.get(id)!, qty }));
  const subtotal = lines.reduce((s, l) => s + (l.product.price ?? 0) * l.qty, 0);
  const needsPrescription = lines.some((l) => l.product.requires_prescription);
  const validRequests = requests.filter((r) => r.name.trim());
  const visible = products.filter((p) => !filter || `${p.name} ${p.strength ?? ""} ${p.description ?? ""}`.toLowerCase().includes(filter.toLowerCase()));

  function buyNow(id: string) {
    update({ [id]: 1 });
    setCheckout(true);
    document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
  }

  async function placeOrder() {
    if (needsPrescription && !prescription) { toast.error("Upload a doctor's prescription for prescription-only items"); return; }
    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "pharmacy",
        provider_id: providerId,
        cart: lines.map((l) => ({ service_id: l.product.id, quantity: l.qty })),
        drug_requests: validRequests.map((r) => ({ name: r.name.trim(), strength: r.strength.trim() || undefined, quantity: r.quantity, notes: r.notes.trim() || undefined })),
        prescription_url: prescription ?? undefined,
        delivery_address: delivery.trim() || undefined,
        patient: patientPayload(patient),
      }),
    });
    const data = (await res.json()) as { id?: string; error?: unknown };
    setSubmitting(false);
    if (!res.ok || !data.id) { toast.error(typeof data.error === "string" ? data.error : "Could not place order"); return; }
    update({});
    toast.success("Order placed");
    router.push(`/bookings/${data.id}`);
  }

  const orderEmpty = lines.length === 0 && validRequests.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5 items-start">
      <div className="space-y-4">
        <Input placeholder="Search products" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search products" />
        {visible.length === 0 && <p className="text-sm text-[#64748B] py-8 text-center">No products match. Use “Drug not listed” below to request it.</p>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left" onClick={() => setExpanded(expanded === p.id ? null : p.id)} aria-expanded={expanded === p.id}>
                      <span className="block font-medium text-sm text-[#0F172A]">{p.name}</span>
                      {p.strength && <span className="block text-xs text-[#64748B]">{p.strength}</span>}
                    </button>
                    <span className="text-sm font-semibold whitespace-nowrap">{p.price != null ? formatCurrency(p.price) : "—"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.requires_prescription && <Badge variant="accent">Prescription required</Badge>}
                    <Badge variant={p.in_stock ? "available" : "cancelled"}>{p.in_stock ? "In stock" : "Out of stock"}</Badge>
                  </div>
                  {expanded === p.id && p.description && <p className="text-xs text-[#374151]">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {cart[p.id] ? (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(p.id, cart[p.id] - 1)} aria-label="Decrease"><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-sm" aria-live="polite">{cart[p.id]}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(p.id, cart[p.id] + 1)} aria-label="Increase"><Plus className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" disabled={!p.in_stock || p.price == null} onClick={() => setQty(p.id, 1)}>
                        <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
                      </Button>
                    )}
                    <Button size="sm" disabled={!p.in_stock || p.price == null} onClick={() => buyNow(p.id)}>Buy Now</Button>
                    <ChatButton providerId={providerId} serviceId={p.id} label="Ask" size="sm" variant="ghost" />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Drug not listed?</h3>
              <Button size="sm" variant="outline" onClick={() => setRequests([...requests, { ...emptyRequest }])}><Plus className="h-3.5 w-3.5" />Add request</Button>
            </div>
            <p className="text-xs text-[#64748B]">The pharmacist will confirm availability and send a quote before you pay.</p>
            {requests.map((r, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr,1fr,80px,auto] gap-2 items-end">
                <div className="space-y-1"><Label htmlFor={`rn-${i}`}>Medication name</Label>
                  <Input id={`rn-${i}`} value={r.name} onChange={(e) => setRequests(requests.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></div>
                <div className="space-y-1"><Label htmlFor={`rs-${i}`}>Strength / dosage</Label>
                  <Input id={`rs-${i}`} value={r.strength} placeholder="e.g. 500mg" onChange={(e) => setRequests(requests.map((x, j) => j === i ? { ...x, strength: e.target.value } : x))} /></div>
                <div className="space-y-1"><Label htmlFor={`rq-${i}`}>Qty</Label>
                  <Input id={`rq-${i}`} type="number" min={1} max={100} value={r.quantity} onChange={(e) => setRequests(requests.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) || 1 } : x))} /></div>
                <Button size="icon" variant="ghost" onClick={() => setRequests(requests.filter((_, j) => j !== i))} aria-label="Remove request"><Trash2 className="h-4 w-4" /></Button>
                <div className="sm:col-span-4 space-y-1"><Label htmlFor={`ri-${i}`}>Additional information (optional)</Label>
                  <Input id={`ri-${i}`} value={r.notes} onChange={(e) => setRequests(requests.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card id="checkout" className="lg:sticky lg:top-20">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Your order</h3>
          {orderEmpty ? <p className="text-sm text-[#64748B]">Your cart is empty.</p> : (
            <ul className="space-y-1 text-sm">
              {lines.map((l) => (
                <li key={l.product.id} className="flex justify-between gap-2"><span>{l.qty} × {l.product.name}</span><span>{formatCurrency((l.product.price ?? 0) * l.qty)}</span></li>
              ))}
              {validRequests.map((r, i) => (
                <li key={`r${i}`} className="flex justify-between gap-2 text-[#64748B]"><span>{r.quantity} × {r.name} {r.strength}</span><span>Quote</span></li>
              ))}
              <li className="flex justify-between border-t border-[#F1F5F9] pt-2 font-semibold"><span>Subtotal</span><span>{formatCurrency(subtotal)}{validRequests.length ? " + quote" : ""}</span></li>
            </ul>
          )}

          <PrescriptionWarning />
          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-1"><FileText className="h-4 w-4" />Prescription {needsPrescription ? <span className="text-red-600">(required)</span> : "(if you have one)"}</p>
            <FileUpload folder="prescriptions" label="Upload prescription" value={prescription} onUploaded={setPrescription} />
          </div>

          {!checkout ? (
            <Button className="w-full" disabled={orderEmpty} onClick={() => setCheckout(true)}>Checkout</Button>
          ) : (
            <div className="space-y-3">
              <PatientFields value={patient} onChange={setPatient} conditionLabel="Notes for the pharmacist (optional)" />
              <div className="space-y-1">
                <Label htmlFor="delivery">Delivery address (leave blank for pickup)</Label>
                <Input id="delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)} autoComplete="street-address" />
              </div>
              <p className="text-xs text-[#64748B]">Payment: Bank Transfer or Transfer Payment. You&apos;ll get the account details and upload proof on the next screen; the pharmacy verifies it before fulfilment.</p>
              <Button className="w-full" loading={submitting} disabled={orderEmpty || !isPatientValid(patient) || (needsPrescription && !prescription)} onClick={placeOrder}>
                Place order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
