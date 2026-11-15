"use client";
import { useState } from "react";
import { Icon } from "./Icon";

/** Uses the phone's own share sheet (WhatsApp, SMS…) when there is one, otherwise copies the link. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("#")[0];
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch { /* closed */ return; } }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  return (
    <button type="button" className="btn btn-quiet btn-sm" onClick={share} aria-live="polite">
      <Icon name={copied ? "check" : "share"} size={18} /> {copied ? "Link copied" : "Share"}
    </button>
  );
}
