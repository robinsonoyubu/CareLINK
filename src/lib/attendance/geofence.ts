/**
 * Facility geofencing. Each site has a configured centre point and radius.
 * A reading counts as inside only when the whole accuracy circle is plausibly
 * within the fence; poor GPS accuracy asks the user to retry (or go to an
 * Attendance Admin for a manual exception) rather than silently passing.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeofenceSite extends GeoPoint {
  radiusM: number;
  /** Readings with a reported accuracy worse than this are not trusted. */
  maxAccuracyM: number;
}

export type GeofenceResult =
  | { status: "inside"; distanceM: number }
  | { status: "outside"; distanceM: number }
  | { status: "low_accuracy"; distanceM: number; accuracyM: number }
  | { status: "invalid_reading" };

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function checkGeofence(
  site: GeofenceSite,
  reading: GeoPoint & { accuracyM: number }
): GeofenceResult {
  const valid =
    Number.isFinite(reading.lat) && Math.abs(reading.lat) <= 90 &&
    Number.isFinite(reading.lng) && Math.abs(reading.lng) <= 180 &&
    Number.isFinite(reading.accuracyM) && reading.accuracyM >= 0;
  if (!valid) return { status: "invalid_reading" };

  const distanceM = Math.round(distanceMeters(site, reading));
  if (reading.accuracyM > site.maxAccuracyM) {
    return { status: "low_accuracy", distanceM, accuracyM: reading.accuracyM };
  }
  return distanceM <= site.radiusM ? { status: "inside", distanceM } : { status: "outside", distanceM };
}
