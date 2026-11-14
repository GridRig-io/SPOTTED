import { useCallback, useEffect, useState } from "react";

/**
 * Loads something once per `key`. `loading` is derived from the key, so there is no setState inside the effect body.
 * Data from the previous key stays visible while a refresh is in flight (good for pull-to-refresh).
 */
export function useLoad<T>(load: (() => Promise<T>) | null, key: string) {
  const [tick, setTick] = useState(0);
  const full = `${key}#${tick}`;
  const [res, setRes] = useState<{ key: string; data: T | null; error: string } | null>(null);
  const enabled = load !== null;

  useEffect(() => {
    if (!load) return;
    let live = true;
    load()
      .then((data) => { if (live) setRes({ key: full, data, error: "" }); })
      .catch((e: unknown) => { if (live) setRes((prev) => ({ key: full, data: prev?.data ?? null, error: e instanceof Error ? e.message : "Something went wrong. Try again." })); });
    return () => { live = false; };
    // `key` stands for everything `load` closes over; callers put every input in it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: res?.data ?? null, error: res && res.key === full ? res.error : "", loading: enabled && res?.key !== full, reload };
}
