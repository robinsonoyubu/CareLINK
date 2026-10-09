import { describe, it, expect } from "vitest";
import { issueQrToken, verifyQrToken } from "@/lib/attendance/qr";
import { checkGeofence, distanceMeters } from "@/lib/attendance/geofence";
import { evaluateAttendance } from "@/lib/attendance/evaluate";
import { canTransition, canRate, bookerCanModify, makeReference } from "@/lib/medlink/bookings";
import { canWithdraw, coinsToNaira, maskAccountNumber, withdrawalProgress } from "@/lib/medlink/earn";
import { priceOrder } from "@/lib/medlink/pricing";
import { PRIMARY_NAV, REMOVED_SECTIONS } from "@/lib/medlink/navigation";
import { buildCalendarEvent } from "@/lib/medlink/google-calendar";

const SECRET = "x".repeat(40);
const ORG = "org-1";
const SITE = "site-1";

describe("dynamic attendance QR", () => {
  it("accepts a fresh token bound to the facility and site", () => {
    const { token } = issueQrToken({ organizationId: ORG, siteId: SITE, now: 1000 }, SECRET);
    const r = verifyQrToken(token, { organizationId: ORG, siteId: SITE, now: 1010 }, SECRET);
    expect(r.ok).toBe(true);
  });

  it("rejects expired tokens", () => {
    const { token } = issueQrToken({ organizationId: ORG, siteId: SITE, now: 1000, ttl: 30 }, SECRET);
    expect(verifyQrToken(token, { organizationId: ORG, now: 1100 }, SECRET)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects tokens for another facility or site", () => {
    const { token } = issueQrToken({ organizationId: ORG, siteId: SITE, now: 1000 }, SECRET);
    expect(verifyQrToken(token, { organizationId: "org-2", now: 1000 }, SECRET)).toEqual({ ok: false, reason: "wrong_facility" });
    expect(verifyQrToken(token, { organizationId: ORG, siteId: "site-2", now: 1000 }, SECRET)).toEqual({ ok: false, reason: "wrong_site" });
  });

  it("rejects tampered or foreign-signed tokens", () => {
    const { token } = issueQrToken({ organizationId: ORG, siteId: SITE, now: 1000 }, SECRET);
    const [p, body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), ttl: 99999 })).toString("base64url");
    expect(verifyQrToken(`${p}.${forged}.${sig}`, { organizationId: ORG, now: 1000 }, SECRET)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyQrToken(token, { organizationId: ORG, now: 1000 }, "y".repeat(40))).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyQrToken("hello", { organizationId: ORG }, SECRET)).toEqual({ ok: false, reason: "malformed" });
  });

  it("gives each token a unique nonce for replay detection", () => {
    const a = issueQrToken({ organizationId: ORG, siteId: SITE, now: 1000 }, SECRET);
    const b = issueQrToken({ organizationId: ORG, siteId: SITE, now: 1000 }, SECRET);
    expect(a.payload.nonce).not.toBe(b.payload.nonce);
  });

  it("refuses to run with a weak secret", () => {
    expect(() => issueQrToken({ organizationId: ORG, siteId: SITE }, "short")).toThrow();
  });
});

describe("geofencing", () => {
  const site = { lat: 6.4541, lng: 3.3947, radiusM: 150, maxAccuracyM: 50 }; // Lagos Island

  it("measures distance with haversine", () => {
    // ~1.11 km per 0.01° latitude
    expect(Math.round(distanceMeters({ lat: 6.45, lng: 3.39 }, { lat: 6.46, lng: 3.39 }))).toBeGreaterThan(1100);
  });

  it("passes inside the fence with good accuracy", () => {
    expect(checkGeofence(site, { lat: 6.4545, lng: 3.3949, accuracyM: 10 }).status).toBe("inside");
  });

  it("fails outside the fence", () => {
    expect(checkGeofence(site, { lat: 6.47, lng: 3.40, accuracyM: 10 }).status).toBe("outside");
  });

  it("asks for a retry when GPS accuracy is poor", () => {
    expect(checkGeofence(site, { lat: 6.4541, lng: 3.3947, accuracyM: 400 }).status).toBe("low_accuracy");
  });

  it("rejects impossible readings", () => {
    expect(checkGeofence(site, { lat: 200, lng: 3.39, accuracyM: 5 }).status).toBe("invalid_reading");
  });
});

describe("three-layer attendance decision", () => {
  const qrOk = { ok: true as const, payload: { organizationId: ORG, siteId: SITE, issuedAt: 0, ttl: 30, nonce: "n" } };
  const inside = { status: "inside" as const, distanceM: 10 };

  it("accepts only when QR, geofence and face all pass", () => {
    expect(evaluateAttendance(qrOk, inside, { status: "match" }).accepted).toBe(true);
  });

  it("never accepts without a face match", () => {
    expect(evaluateAttendance(qrOk, inside, { status: "not_configured" })).toEqual({ accepted: false, reasons: ["face_not_configured"] });
    expect(evaluateAttendance(qrOk, inside, { status: "liveness_failed" }).accepted).toBe(false);
    expect(evaluateAttendance(qrOk, inside, null).accepted).toBe(false);
  });

  it("collects every failing layer", () => {
    const r = evaluateAttendance({ ok: false, reason: "expired" }, { status: "outside", distanceM: 900 }, null);
    expect(r).toEqual({ accepted: false, reasons: ["qr_expired", "geofence_outside"] });
  });
});

describe("bookings", () => {
  it("enforces the status flow", () => {
    expect(canTransition("payment_pending", "payment_verification")).toBe(true);
    expect(canTransition("payment_pending", "confirmed")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(canTransition("rgh_review", "payment_pending")).toBe(true);
  });

  it("only unlocks ratings after completion", () => {
    expect(canRate("completed")).toBe(true);
    expect(canRate("confirmed")).toBe(false);
  });

  it("stops the booker modifying a booking once underway", () => {
    expect(bookerCanModify("confirmed")).toBe(true);
    expect(bookerCanModify("in_progress")).toBe(false);
    expect(bookerCanModify("dispatched")).toBe(false);
  });

  it("makes unambiguous references", () => {
    const ref = makeReference("MLB");
    expect(ref).toMatch(/^MLB-[2-9A-HJ-NP-Z]{6}$/);
  });
});

describe("Earn", () => {
  it("opens withdrawal at 100 coins", () => {
    expect(canWithdraw(99)).toBe(false);
    expect(canWithdraw(100)).toBe(true);
    expect(withdrawalProgress(50)).toBe(50);
    expect(withdrawalProgress(250)).toBe(100);
  });

  it("refuses to convert until a rate is configured", () => {
    expect(coinsToNaira(100, null)).toBeNull();
    expect(coinsToNaira(100, 0)).toBeNull();
    expect(coinsToNaira(120, 10)).toBe(1200);
  });

  it("masks the OPay number", () => {
    expect(maskAccountNumber("8031234567")).toBe("******4567");
    expect(maskAccountNumber("123")).toBe("***");
  });
});

describe("pharmacy pricing", () => {
  const catalogue = [
    { id: "a", name: "Paracetamol", price: 500, requires_prescription: false, in_stock: true },
    { id: "b", name: "Amoxicillin", price: 2500, requires_prescription: true, in_stock: true },
    { id: "c", name: "Out", price: 100, requires_prescription: false, in_stock: false },
  ];

  it("prices from the catalogue, not the client", () => {
    const r = priceOrder([{ service_id: "a", quantity: 2 }], [], catalogue);
    expect(r.subtotal).toBe(1000);
    expect(r.needsPrescription).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("flags prescription-only items", () => {
    expect(priceOrder([{ service_id: "b", quantity: 1 }], [], catalogue).needsPrescription).toBe(true);
  });

  it("rejects unknown, out-of-stock and silly quantities", () => {
    const r = priceOrder([{ service_id: "zz", quantity: 1 }, { service_id: "c", quantity: 1 }, { service_id: "a", quantity: 0 }], [], catalogue);
    expect(r.errors).toHaveLength(3);
  });

  it("marks unlisted drug requests for a quote", () => {
    const r = priceOrder([], [{ name: "Drug X", strength: "10mg", quantity: 1 }, { name: "  ", quantity: 1 }], catalogue);
    expect(r.needsQuote).toBe(true);
    expect(r.requests).toHaveLength(1);
  });
});

describe("navigation", () => {
  it("matches the v8 primary navigation exactly", () => {
    expect(PRIMARY_NAV.map((n) => n.label)).toEqual([
      "Home", "Hospitals", "Diagnostics", "Pharmacy", "Ambulance & Paramedics", "Earn",
      "Health Gist", "My Bookings", "My Chats", "Notifications", "Profile",
    ]);
  });

  it("does not re-add removed sections", () => {
    const labels = PRIMARY_NAV.map((n) => n.label as string);
    for (const removed of REMOVED_SECTIONS) expect(labels).not.toContain(removed);
  });
});

describe("Google Calendar event", () => {
  it("includes provider/service, time, location, reference and instructions", () => {
    const e = buildCalendarEvent({
      id: "b1", reference: "MLB-ABCDEF", kind: "diagnostic", scheduled_at: "2026-11-01T09:00:00Z", ends_at: null,
      pickup_address: null, collection_method: "in_centre", notes: "Fast for 8 hours",
      provider: { name: "Lagos Labs", address: "12 Broad St" }, service: { name: "Full Blood Count" },
    }, "https://app.example");
    expect(e?.summary).toBe("MedLINK: Full Blood Count — Lagos Labs");
    expect(e?.location).toBe("12 Broad St");
    expect(e?.description).toContain("MLB-ABCDEF");
    expect(e?.description).toContain("Fast for 8 hours");
    expect(e?.end.dateTime).toBe("2026-11-01T09:30:00.000Z");
  });

  it("skips unscheduled bookings", () => {
    expect(buildCalendarEvent({ id: "b", reference: "R", kind: "pharmacy", scheduled_at: null, ends_at: null, pickup_address: null, collection_method: null, notes: null }, "")).toBeNull();
  });
});

import { shouldShowBreakAd, GAMES } from "@/lib/medlink/games";

describe("game ad frequency", () => {
  it("waits for enough rounds and a minimum interval", () => {
    expect(shouldShowBreakAd(1, null, 0)).toBe(false);
    expect(shouldShowBreakAd(3, null, 0)).toBe(true);
    expect(shouldShowBreakAd(3, 1_000_000, 1_060_000)).toBe(false);
    expect(shouldShowBreakAd(3, 1_000_000, 1_000_000 + 3 * 60 * 1000)).toBe(true);
  });

  it("lists all six v8 games with original titles", () => {
    expect(GAMES).toHaveLength(6);
    expect(GAMES.map((g) => g.title).join(" ")).not.toMatch(/Zuma|Nokia/);
  });
});
