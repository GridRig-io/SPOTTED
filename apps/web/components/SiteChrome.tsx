"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { useAuth } from "./AuthProvider";

const TABS = [
  { href: "/", label: "Explore", icon: "search", match: (p: string) => p === "/" || p.startsWith("/search") || p.startsWith("/place") },
  { href: "/saved", label: "Saved", icon: "heart", match: (p: string) => p.startsWith("/saved") },
  { href: "/trips", label: "Trips", icon: "luggage", match: (p: string) => p.startsWith("/trips") || p.startsWith("/booking") || p.startsWith("/checkout") },
  { href: "/account", label: "Profile", icon: "user", match: (p: string) => p.startsWith("/account") || p.startsWith("/signin") },
];

export function Header() {
  const path = usePathname();
  const { user, ready } = useAuth();
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" aria-label="Spotted home"><Logo height={34} /></Link>
        <nav className="nav-links" aria-label="Main">
          {TABS.slice(0, 3).map((t) => <Link key={t.href} href={t.href} className="nav-link" aria-current={t.match(path) ? "page" : undefined}>{t.label}</Link>)}
          <Link href="/help" className="nav-link" aria-current={path.startsWith("/help") ? "page" : undefined}>Help</Link>
        </nav>
        <div className="row gap-2">
          {ready && user ? (
            <Link href="/account" className="btn btn-quiet btn-sm"><Icon name="user" size={18} /> Account</Link>
          ) : (
            <Link href="/signin" className="btn btn-sm">{ready ? "Sign in" : "Sign in"}</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={t.match(path) ? "page" : undefined}>
          <Icon name={t.icon} size={24} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container stack gap-6">
        <Logo height={36} tone="cream" />
        <div className="row wrap gap-8" style={{ alignItems: "flex-start" }}>
          <div className="stack gap-2" style={{ maxWidth: 320 }}>
            <p style={{ color: "var(--c-sage)" }}>Places worth staying. Every room in Abuja, with the power, water, wifi and security spelled out before you book.</p>
          </div>
          <div className="stack gap-2"><span className="eyebrow">Guests</span><Link href="/search">Find a place</Link><Link href="/trips">Your trips</Link><Link href="/help">Help</Link></div>
          <div className="stack gap-2"><span className="eyebrow">Hosts</span><Link href="/help#hosts">List your place</Link><Link href="/help#claim">Claim a listing</Link></div>
        </div>
        <p className="caption" style={{ color: "var(--c-sage)" }}>© Spotted · Abuja, Nigeria</p>
      </div>
    </footer>
  );
}
