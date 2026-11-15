"use client";
import { useState } from "react";
import { appleDirectionsUrl, distanceKm, formatDistance, googleDirectionsUrl, type LatLng, type PrivateDetails } from "@spotted/core";
import { Icon } from "./Icon";
import { MapView } from "./MapView";

/**
 * Everything a guest needs to arrive: exact pin, their own position, distance, one-tap directions,
 * the landmark the host gave, gate notes, wifi and the host's number. Only rendered once the database shares it.
 */
export function Directions({ priv, name }: { priv: PrivateDetails; name: string }) {
  const [me, setMe] = useState<LatLng | null>(null);
  const [msg, setMsg] = useState("");
  const pin = priv.lat !== null && priv.lng !== null ? { lat: Number(priv.lat), lng: Number(priv.lng) } : null;

  function locate() {
    setMsg("");
    if (!("geolocation" in navigator)) { setMsg("This device cannot share its location."); return; }
    setMsg("Finding where you are…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg(""); },
      (e) => setMsg(e.code === 1 ? "Location is off for this site. Allow it in your browser settings, or just tap Get directions." : "Could not find your location right now."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="card pad stack gap-4">
      <div className="row between wrap gap-2"><h3>Getting there</h3>{pin && me ? <span className="badge">{formatDistance(distanceKm(me, pin))}</span> : null}</div>
      {pin ? (
        <>
          <MapView mode="exact" center={pin} me={me} height={280} ariaLabel={`Exact location of ${name}`} />
          <div className="row wrap gap-2">
            <a className="btn btn-accent" href={googleDirectionsUrl(pin)} target="_blank" rel="noreferrer"><Icon name="navigation" size={18} /> Get directions</a>
            <a className="btn btn-quiet" href={appleDirectionsUrl(pin, name)} target="_blank" rel="noreferrer">Apple Maps</a>
            <button type="button" className="btn btn-quiet" onClick={locate}><Icon name="locate-fixed" size={18} /> Show me on the map</button>
          </div>
          {msg ? <p className="small muted" role="status">{msg}</p> : null}
        </>
      ) : <p className="muted small">The host has not dropped an exact pin yet. Use the address and landmark below, or call them.</p>}

      <div className="stack gap-3">
        {priv.street_address ? <p className="row gap-2" style={{ alignItems: "flex-start" }}><Icon name="map-pin" size={18} /> <span><b>Address</b><br />{priv.street_address}</span></p> : null}
        {priv.landmark ? <p className="row gap-2" style={{ alignItems: "flex-start" }}><Icon name="landmark" size={18} /> <span><b>Landmark</b><br />{priv.landmark}</span></p> : null}
        {priv.directions_note ? <p className="row gap-2" style={{ alignItems: "flex-start" }}><Icon name="navigation" size={18} /> <span><b>From the host</b><br />{priv.directions_note}</span></p> : null}
        {priv.gate_instructions ? <p className="row gap-2" style={{ alignItems: "flex-start" }}><Icon name="door-closed" size={18} /> <span><b>At the gate</b><br />{priv.gate_instructions}</span></p> : null}
        {priv.wifi_name ? <p className="row gap-2"><Icon name="wifi" size={18} /> {priv.wifi_name}{priv.wifi_password ? ` · password ${priv.wifi_password}` : ""}</p> : null}
        {priv.host_phone ? <a className="btn btn-quiet" style={{ alignSelf: "flex-start" }} href={`tel:${priv.host_phone}`}><Icon name="phone" size={18} /> Call the host · {priv.host_phone}</a> : null}
      </div>
    </div>
  );
}
