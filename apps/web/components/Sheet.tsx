"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/** Bottom sheet on phones, centred dialog on larger screens. Esc closes, focus stays inside, page behind does not scroll. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector<HTMLElement>("button, a, input, select, textarea");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const f = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input, select, textarea")];
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; before?.focus?.(); };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Rendered at the end of <body> so no sticky or transformed parent can trap it under the tab bar.
  return createPortal(
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`sheet sheet-flex${wide ? " sheet-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <h2 style={{ fontSize: 20, lineHeight: "26px" }}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer ? <div className="sheet-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
