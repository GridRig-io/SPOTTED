import Link from "next/link";
import { AMENITY_COUNT } from "@spotted/tokens";
import { Icon } from "@/components/Icon";
import { PinMark } from "@/components/Logo";

export const metadata = { title: "List your place", description: "List your flat, guest house or short-let on Spotted. Free for your first 2 months." };

const STEPS = [
  { icon: "user", t: "Tell us who you are", d: "Your name and a phone number. Takes a minute." },
  { icon: "house", t: "Add your place and rooms", d: "Price per night, how many nights, who it sleeps." },
  { icon: "image", t: "Photos and plain answers", d: `At least 5 photos per room and ${AMENITY_COUNT} yes, extra-cost or no questions: power, water, wifi, security and more.` },
  { icon: "locate-fixed", t: "Drop your pin", d: "Stand at the place and tap Use my current location, add a landmark, and guests can find you." },
  { icon: "badge-check", t: "We check, you go live", d: "A Spotted reviewer looks over every listing before guests see it. Usually within 2 working days." },
];

export default function HostLanding() {
  return (
    <>
      <section className="hero" style={{ paddingBottom: 48 }}>
        <div className="hero-pin" aria-hidden="true"><PinMark size={340} color="#F5480F" /></div>
        <div className="container stack gap-4" style={{ position: "relative" }}>
          <span className="badge" style={{ alignSelf: "flex-start", background: "rgba(250,245,233,.14)", color: "var(--c-cream)" }}>For owners and managers</span>
          <h1>Get your place in front of guests.</h1>
          <p className="lead">Flats, guest houses and short-lets across Nigeria. No website needed, and your first 2 months are free.</p>
          <div className="row wrap gap-3" style={{ marginTop: 8 }}>
            <Link href="/host/start" className="btn btn-accent">List your place</Link>
            <Link href="/host/dashboard" className="btn btn-ghost" style={{ color: "var(--c-cream)", borderColor: "var(--c-sage)" }}>I already host</Link>
          </div>
        </div>
      </section>

      <section className="container section stack gap-6">
        <h2>How it works</h2>
        <ol className="stack gap-4" style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 760 }}>
          {STEPS.map((s, i) => (
            <li key={s.t} className="row gap-4" style={{ alignItems: "flex-start" }}>
              <span className="step">{i + 1}</span>
              <span className="stack gap-1"><b className="row gap-2"><Icon name={s.icon} size={18} /> {s.t}</b><span className="muted">{s.d}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="container stack gap-4" style={{ paddingBottom: 48 }}>
        <div className="glance" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div className="card pad stack gap-2"><span className="iconbox"><Icon name="clock" size={22} /></span><h4>Free for 2 months</h4><p className="small muted">After that, a small monthly listing fee and a commission on each booking. You will see the exact amounts before anything is charged.</p></div>
          <div className="card pad stack gap-2"><span className="iconbox"><Icon name="shield-check" size={22} /></span><h4>Your address stays private</h4><p className="small muted">Guests only see the rough area. The exact pin, gate notes and your phone go to confirmed guests from the day before they arrive.</p></div>
          <div className="card pad stack gap-2"><span className="iconbox"><Icon name="calendar-x" size={22} /></span><h4>You control the calendar</h4><p className="small muted">Block dates for family, repairs or bookings you took elsewhere, and guests cannot pick them.</p></div>
        </div>
        <p className="small muted">Already listed by Spotted before you joined? Open your place from search and tap <b>Ask to claim this place</b>.</p>
      </section>
    </>
  );
}
