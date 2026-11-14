import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Payment received" };

/** Where the payment gateway sends someone who started the payment from the app. The app checks the payment itself, so this page only hands them back. */
export default function Page({ searchParams }: PageProps<"/pay/done">) {
  return <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 280, maxWidth: 440 }} /></div>}><Done searchParams={searchParams} /></Suspense>;
}

async function Done({ searchParams }: { searchParams: PageProps<"/pay/done">["searchParams"] }) {
  const sp = await searchParams;
  const raw = sp.code;
  const code = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const safe = /^[A-Za-z0-9-]{4,24}$/.test(code) ? code : "";
  return (
    <div className="container section" style={{ maxWidth: 460 }}>
      <div className="card pad stack gap-4" style={{ alignItems: "flex-start" }}>
        <Logo height={32} />
        <span className="iconbox"><Icon name="check" size={22} /></span>
        <h2>Thanks, that went through</h2>
        <p className="muted">Go back to the Spotted app. It will confirm your booking in a few seconds.</p>
        <a className="btn btn-accent btn-block" href={safe ? `spotted://booking/${safe}` : "spotted://"}>Back to the Spotted app</a>
        <p className="caption muted">If the app does not open, close this window yourself and it will pick up where you left off.</p>
      </div>
    </div>
  );
}
