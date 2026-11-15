// Maps and directions. Free OpenStreetMap tiles for display; Google Maps or Apple Maps for turn-by-turn.

export interface LatLng { lat: number; lng: number }

/** Straight-line distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "800 m away", "3.4 km away", "about 12 km away". Public spots are rounded, so far distances are rough. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(100, Math.round(km * 10) * 100)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `about ${Math.round(km)} km away`;
}

/** Opens turn-by-turn directions in Google Maps (web, Android, iPhone). Origin is the phone's own location. */
export function googleDirectionsUrl(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=driving`;
}

/** Same, in Apple Maps (iPhone). */
export function appleDirectionsUrl(to: LatLng, label?: string): string {
  return `https://maps.apple.com/?daddr=${to.lat},${to.lng}&dirflg=d${label ? `&q=${encodeURIComponent(label)}` : ""}`;
}

/** View a spot (no directions) in Google Maps. */
export function googleViewUrl(at: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}`;
}

/** OpenStreetMap tiles (free; attribution required wherever the map is shown). */
export const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

/** Rough radius of a public (rounded) spot, in metres. Shown as a circle, never a pin, until the guest books. */
export const APPROX_RADIUS_M = 700;

/** Nigeria's rough bounds, used to reject GPS readings from outside the country (and typos). */
export function inNigeria(p: LatLng): boolean {
  return p.lat >= 4 && p.lat <= 14.5 && p.lng >= 2.5 && p.lng <= 15;
}
