/**
 * Pharmacy cart pricing. Catalogue items are priced from the database, never
 * from the client. "Drug not listed" requests carry no price until the
 * pharmacy quotes them.
 */

export interface CatalogueItem {
  id: string;
  name: string;
  price: number | null;
  requires_prescription: boolean;
  in_stock: boolean;
  strength?: string | null;
}

export type CartLine = { service_id: string; quantity: number };
export type DrugRequestLine = { name: string; strength?: string; quantity: number; notes?: string };

export type PricedOrder = {
  lines: { service_id: string; name: string; strength: string | null; quantity: number; unit_price: number; requires_prescription: boolean }[];
  requests: DrugRequestLine[];
  subtotal: number;
  needsPrescription: boolean;
  needsQuote: boolean;
  errors: string[];
};

export function priceOrder(cart: CartLine[], requests: DrugRequestLine[], catalogue: CatalogueItem[]): PricedOrder {
  const byId = new Map(catalogue.map((c) => [c.id, c]));
  const errors: string[] = [];
  const lines: PricedOrder["lines"] = [];

  for (const line of cart) {
    const item = byId.get(line.service_id);
    if (!item) { errors.push(`Unknown product ${line.service_id}`); continue; }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) { errors.push(`Invalid quantity for ${item.name}`); continue; }
    if (!item.in_stock) { errors.push(`${item.name} is out of stock`); continue; }
    if (item.price == null) { errors.push(`${item.name} has no listed price`); continue; }
    lines.push({
      service_id: item.id,
      name: item.name,
      strength: item.strength ?? null,
      quantity: line.quantity,
      unit_price: item.price,
      requires_prescription: item.requires_prescription,
    });
  }

  const cleanRequests = requests.filter((r) => r.name.trim().length > 0);
  for (const r of cleanRequests) {
    if (!Number.isInteger(r.quantity) || r.quantity < 1 || r.quantity > 100) errors.push(`Invalid quantity for ${r.name}`);
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.unit_price * l.quantity, 0) * 100) / 100;
  return {
    lines,
    requests: cleanRequests,
    subtotal,
    // Unlisted drugs may be prescription-only; the pharmacist decides, so we ask for one if available.
    needsPrescription: lines.some((l) => l.requires_prescription),
    needsQuote: cleanRequests.length > 0,
    errors,
  };
}
