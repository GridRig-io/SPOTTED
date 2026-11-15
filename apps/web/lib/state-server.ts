import { cookies } from "next/headers";
import { listAreas, listStates, type Area, type Db, type State } from "@spotted/core";
import { DEFAULT_STATE, STATE_COOKIE } from "./state";

/** Works out which state to show: the URL first, then the remembered choice, then Abuja (FCT). */
export async function resolveState(db: Db, fromUrl?: string | null): Promise<{ states: State[]; state: State | null; areas: Area[] }> {
  const states = await listStates(db);
  const jar = await cookies();
  const wanted = fromUrl || jar.get(STATE_COOKIE)?.value || DEFAULT_STATE;
  const state = states.find((s) => s.slug === wanted) ?? states.find((s) => s.slug === DEFAULT_STATE) ?? states[0] ?? null;
  const areas = state ? await listAreas(db, state) : [];
  return { states, state, areas };
}
