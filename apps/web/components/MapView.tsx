"use client";
import { useEffect, useRef } from "react";
import { APPROX_RADIUS_M, OSM_ATTRIBUTION, OSM_TILES, type LatLng } from "@spotted/core";
import "leaflet/dist/leaflet.css";

export interface MapMarker extends LatLng { id: string; label: string; href?: string; title?: string }

/**
 * One map component for three jobs, all on free OpenStreetMap tiles:
 *  - "area":   a soft circle for the rough location (before booking, never a pin)
 *  - "exact":  the real pin (after booking), plus the guest's own position if they share it
 *  - "results": price pills for search results
 */
type Props = {
  mode: "area" | "exact" | "results" | "pick"; center: LatLng; markers?: MapMarker[]; zoom?: number; height?: number | string;
  me?: LatLng | null; onPick?: (p: LatLng) => void; ariaLabel?: string;
};

export function MapView(props: Props) {
  const { center, zoom = 14, height = 320, ariaLabel } = props;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; });

  // create once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      const map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], zoom);
      L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => propsRef.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      mapRef.current = map; layerRef.current = layer;
      drawMap(L, map, layer, propsRef.current, (p) => propsRef.current.onPick?.(p));
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw when data changes
  const key = JSON.stringify([props.mode, center.lat, center.lng, props.markers ?? [], props.me?.lat, props.me?.lng]);
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      if (mapRef.current && layerRef.current) drawMap(L, mapRef.current, layerRef.current, propsRef.current, (p) => propsRef.current.onPick?.(p));
    })();
  }, [key]);

  return <div ref={el} className="map" style={{ height }} role="region" aria-label={ariaLabel ?? "Map"} />;
}

function drawMap(L: typeof import("leaflet"), map: import("leaflet").Map, layer: import("leaflet").LayerGroup, p: Props, pick: (x: LatLng) => void) {
  const { mode, center, markers = [], me } = p;
  layer.clearLayers();
  const pin = (cls: string) => L.divIcon({ className: "", html: `<span class="map-pin ${cls}"></span>`, iconSize: [28, 36], iconAnchor: [14, 34] });
  if (mode === "area") {
    L.circle([center.lat, center.lng], { radius: APPROX_RADIUS_M, color: "#14442F", weight: 2, fillColor: "#2F6B4F", fillOpacity: 0.18 }).addTo(layer);
    map.setView([center.lat, center.lng], 14);
  }
  if (mode === "exact" || mode === "pick") {
    L.marker([center.lat, center.lng], { icon: pin("exact"), keyboard: false, draggable: mode === "pick" })
      .on("dragend", (e) => { const q = (e.target as import("leaflet").Marker).getLatLng(); pick({ lat: q.lat, lng: q.lng }); })
      .addTo(layer);
    if (me) {
      L.circleMarker([me.lat, me.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }).addTo(layer);
      map.fitBounds(L.latLngBounds([[center.lat, center.lng], [me.lat, me.lng]]), { padding: [40, 40], maxZoom: 16 });
    } else map.setView([center.lat, center.lng], mode === "pick" ? Math.max(map.getZoom(), 16) : 16);
  }
  if (mode === "results") {
    const pts = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    for (const m of pts) {
      const icon = L.divIcon({ className: "", html: `<span class="map-price">${escapeHtml(m.label)}</span>`, iconAnchor: [0, 16] });
      const mk = L.marker([m.lat, m.lng], { icon, title: m.title ?? m.label, keyboard: true }).addTo(layer);
      if (m.href) mk.on("click", () => { window.location.href = m.href!; });
    }
    if (me) L.circleMarker([me.lat, me.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }).addTo(layer);
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.map((m) => [m.lat, m.lng] as [number, number])), { padding: [40, 40], maxZoom: 15 });
    else if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 14);
    else map.setView([center.lat, center.lng], 11);
  }
  setTimeout(() => map.invalidateSize(), 50);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
