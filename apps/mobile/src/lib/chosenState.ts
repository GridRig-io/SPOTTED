import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "spotted_state";
export const DEFAULT_STATE = "fct";

/** The state the guest last browsed, remembered on the phone (same idea as the website's cookie). A state in the link wins. */
export function useChosenState(fromParams?: string): [string, (slug: string) => void] {
  const [stored, setStored] = useState<string | null>(null);
  useEffect(() => {
    if (fromParams) { void AsyncStorage.setItem(KEY, fromParams); return; }
    let live = true;
    AsyncStorage.getItem(KEY).then((v) => { if (live && v) setStored(v); }).catch(() => {});
    return () => { live = false; };
  }, [fromParams]);
  const choose = useCallback((s: string) => { setStored(s); void AsyncStorage.setItem(KEY, s); }, []);
  return [fromParams || stored || DEFAULT_STATE, choose];
}
