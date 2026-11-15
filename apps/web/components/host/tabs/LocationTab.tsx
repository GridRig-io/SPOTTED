"use client";
import { useEffect, useState } from "react";
import { inNigeria, listAreas, normalizeNgPhone, savePrivate, type Area, type LatLng } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { MapView } from "@/components/MapView";
import type { TabProps } from "../ListingEditor";
import { SaveBar } from "./SaveBar";

/**
 * Exact location: stand at the place and tap "Use my current location", or tap/drag on the map.
 * Saved privately; guests only see a rounded spot until they have a confirmed booking.
 */
export function LocationTab({ b, reload, db, onNext }: TabProps) {
  const pv = b.priv;
  const [pin, setPin] = useState<LatLng | null>(pv?.lat && pv?.lng ? { lat: Number(pv.lat), lng: Number(pv.lng) } : null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const [area, setArea] = useState<Area | null>(null);
  const [address, setAddress] = useState(pv?.street_address ?? "");
  const [landmark, setLandmark] = useState(pv?.landmark ?? "");
  const [note, setNote] = useState(pv?.directions_note ?? "");
  const [gate, setGate] = useState(pv?.gate_instructions ?? "");
  const [wifiName, setWifiName] = useState(pv?.wifi_name ?? "");
  const [wifiPass, setWifiPass] = useState(pv?.wifi_password ?? "");
  const [phone, setPhone] = useState(pv?.host_phone ?? "");

  useEffect(() => { listAreas(db).then((a) => setArea(a.find((x) => x.id === b.property.area_id) ?? null)).catch(() => {}); }, [db, b.property.area_id]);

  function useMyLocation() {
    setLocMsg("");
    if (!("geolocation" in navigator)) { setLocMsg("This device cannot share its location. Tap the map instead."); return; }
    setLocMsg("Finding your location… stay still for a moment.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const at = { lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) };
        if (!inNigeria(at)) { setLocMsg("That reading is outside Nigeria. Are you at the place? You can also tap the map."); return; }
        setPin(at); setAccuracy(Math.round(p.coords.accuracy));
        setLocMsg(p.coords.accuracy > 80 ? "Got it, but the reading is rough. Step outside or drag the pin onto the exact building." : "Got it. Drag the pin if it is not exactly on the building.");
      },
      (e) => setLocMsg(e.code === 1 ? "Location is blocked for this site. Allow it in your browser settings, or tap the map." : "Could not get a reading. Try outside, or tap the map."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  async function save() {
    const ph = phone.trim() ? normalizeNgPhone(phone) : null;
    if (phone.trim() && !ph) throw new Error("Enter a Nigerian phone number, like 0803 123 4567.");
    if (pin && !inNigeria(pin)) throw new Error("The pin must be in Nigeria.");
    await savePrivate(db, b.property.id, {
      lat: pin?.lat ?? null, lng: pin?.lng ?? null, street_address: address.trim() || null, landmark: landmark.trim() || null,
      directions_note: note.trim() || null, gate_instructions: gate.trim() || null, wifi_name: wifiName.trim() || null,
      wifi_password: wifiPass.trim() || null, host_phone: ph,
    });
    await reload();
  }

  const center = pin ?? (area ? { lat: Number(area.lat), lng: Number(area.lng) } : { lat: 9.0765, lng: 7.3986 });
  return (
    <section className="stack gap-4">
      <h2>Location and arrival</h2>
      <p className="muted"><b>Private.</b> Guests see only the rough area until they book. From the day before check-in, a confirmed guest gets this exact pin, a Get directions button and everything below.</p>
      <div className="card pad stack gap-3">
        <div className="row between wrap gap-2">
          <h3>Exact pin</h3>
          <button type="button" className="btn btn-accent btn-sm" onClick={useMyLocation}><Icon name="locate-fixed" size={18} /> Use my current location</button>
        </div>
        <p className="small muted">Best done while you are at the place. Or tap the map, then drag the pin onto the building.</p>
        <MapView mode="pick" center={center} height={340} onPick={(p) => { setPin({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) }); setAccuracy(null); }} ariaLabel="Map: tap to place the pin" />
        {locMsg ? <p className="small" role="status">{locMsg}</p> : null}
        <p className="small muted">{pin ? <>Pin: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}{accuracy ? ` · accurate to about ${accuracy} m` : ""}</> : "No pin yet."}</p>
      </div>
      <div className="card pad stack gap-4">
        <div className="field"><label htmlFor="l-a">Street address</label><input id="l-a" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number, street, estate" autoComplete="street-address" /></div>
        <div className="field"><label htmlFor="l-l">Landmark</label><input id="l-l" className="input" value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={200} placeholder="For example, opposite the Total filling station, blue gate" /><span className="hint">What a driver or okada rider would recognise.</span></div>
        <div className="field"><label htmlFor="l-d">Directions from the main road (optional)</label><textarea id="l-d" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="Turn left after the mosque, third house on the right…" /></div>
        <div className="field"><label htmlFor="l-g">At the gate (optional)</label><input id="l-g" className="input" value={gate} onChange={(e) => setGate(e.target.value)} placeholder="Tell the guard your booking code" /></div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="l-w">Wifi name (optional)</label><input id="l-w" className="input" value={wifiName} onChange={(e) => setWifiName(e.target.value)} /></div>
          <div className="field"><label htmlFor="l-wp">Wifi password (optional)</label><input id="l-wp" className="input" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="l-p">Phone for guests</label><input id="l-p" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0803 123 4567" /><span className="hint">Only shared with confirmed guests.</span></div>
      </div>
      <SaveBar onSave={save} onNext={onNext} />
    </section>
  );
}
