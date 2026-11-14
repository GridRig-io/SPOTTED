"use client";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useAuth } from "./AuthProvider";

export function SaveButton({ propertyId, className = "save", label = false }: { propertyId: string; className?: string; label?: boolean }) {
  const { user, savedIds, toggleSaved } = useAuth();
  const router = useRouter();
  const saved = savedIds.has(propertyId);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this place"}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) { router.push(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
        void toggleSaved(propertyId);
      }}
    >
      <Icon name="heart" size={20} color={saved ? "var(--c-bright)" : "var(--c-ink)"} fill={saved ? "var(--c-bright)" : "none"} />
      {label ? <span style={{ marginLeft: 6 }}>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
