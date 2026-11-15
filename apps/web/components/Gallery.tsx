"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Photo as PhotoT } from "@spotted/core";
import { Icon } from "./Icon";
import { Photo } from "./Photo";

/**
 * Phones: swipe through photos with a "2 / 6" counter. Laptops: one big photo and four small ones.
 * Either way, "Show all photos" opens a full-screen viewer (arrow keys, swipe, Esc to close).
 */
export function Gallery({ photos, seed, name }: { photos: PhotoT[]; seed: string; name: string }) {
  const list: (PhotoT | null)[] = photos.length ? photos : [null];
  const [idx, setIdx] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = strip.current; if (!el) return;
    setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth * 0.88 + 8)));
  };

  return (
    <div className="gallery-wrap">
      <div className="gallery" ref={strip} onScroll={onScroll} aria-label={`Photos of ${name}`}>
        {list.slice(0, 5).map((p, i) => (
          <button key={i} type="button" className="gallery-item" onClick={() => setViewer(i)} aria-label={`Open photo ${i + 1} of ${list.length}`}>
            <Photo photo={p} seed={seed} index={i} alt={`${name}, photo ${i + 1}`} priority={i === 0} />
          </button>
        ))}
      </div>
      {list.length > 1 ? <span className="gallery-count" aria-hidden="true">{Math.min(idx + 1, list.length)} / {list.length}</span> : null}
      {list.length > 1 ? <button type="button" className="btn btn-quiet btn-sm gallery-all" onClick={() => setViewer(0)}><Icon name="image" size={16} /> Show all {list.length} photos</button> : null}
      {viewer !== null ? <Viewer photos={list} seed={seed} name={name} start={viewer} onClose={() => setViewer(null)} /> : null}
    </div>
  );
}

function Viewer({ photos, seed, name, start, onClose }: { photos: (PhotoT | null)[]; seed: string; name: string; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const track = useRef<HTMLDivElement>(null);
  const go = useCallback((n: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, n));
    setI(next);
    track.current?.children[next]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [photos.length]);

  useEffect(() => {
    track.current?.children[start]?.scrollIntoView({ inline: "center", block: "nearest" });
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [start, onClose, go, i]);

  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={`Photos of ${name}`}>
      <div className="viewer-top">
        <span className="small" aria-live="polite">{i + 1} / {photos.length}</span>
        <button type="button" className="icon-btn on-dark" onClick={onClose} aria-label="Close photos" autoFocus><Icon name="x" size={22} /></button>
      </div>
      <div className="viewer-track" ref={track} onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}>
        {photos.map((p, n) => <div key={n} className="viewer-slide"><Photo photo={p} seed={seed} index={n} alt={`${name}, photo ${n + 1}`} /></div>)}
      </div>
      <button type="button" className="viewer-nav prev icon-btn on-dark" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous photo"><Icon name="chevron-left" size={26} /></button>
      <button type="button" className="viewer-nav next icon-btn on-dark" onClick={() => go(i + 1)} disabled={i === photos.length - 1} aria-label="Next photo"><Icon name="chevron-right" size={26} /></button>
    </div>,
    document.body,
  );
}
