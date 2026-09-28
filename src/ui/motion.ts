import { useCallback, useSyncExternalStore } from "react";
import { META_KEYS } from "../data/metaKeys";
import { useOptionalSession } from "./session/SessionProvider";
import type { SessionMeta } from "./session/types";

const listeners = new WeakMap<SessionMeta, Set<() => void>>();

/** Missing means on. Only `"0"` keeps the pet still and opens windows at once. */
export function readAnimationsOn(raw: string | null | undefined): boolean {
  return raw !== "0";
}

function notify(meta: SessionMeta) {
  const set = listeners.get(meta);
  if (!set) return;
  for (const listener of set) listener();
}

export function writeAnimationsOn(meta: SessionMeta, on: boolean) {
  meta.set(META_KEYS.animationsOn, on ? "1" : "0");
  notify(meta);
}

/** On when there is no session, so a screen rendered alone keeps moving. */
export function useAnimationsOn(): boolean {
  const meta = useOptionalSession()?.meta;
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!meta) return () => {};
      const set = listeners.get(meta) ?? new Set<() => void>();
      listeners.set(meta, set);
      set.add(listener);
      return () => {
        set.delete(listener);
      };
    },
    [meta],
  );
  const read = useCallback(() => (meta ? readAnimationsOn(meta.get(META_KEYS.animationsOn)) : true), [meta]);
  return useSyncExternalStore(subscribe, read, () => true);
}

export function useModalAnimation(kind: "fade" | "slide"): "fade" | "slide" | "none" {
  return useAnimationsOn() ? kind : "none";
}
