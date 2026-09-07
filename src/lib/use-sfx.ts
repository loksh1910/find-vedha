"use client";

import { useCallback } from "react";
import { useSettings } from "@/components/providers/settings-provider";
import { playSfx, type SfxKind } from "@/lib/sound";

/** Returns a `play(kind)` bound to the viewer's Sound settings. */
export function useSfx() {
  const { sfx, sfxVol } = useSettings();
  return useCallback(
    (kind: SfxKind) => {
      if (!sfx) return;
      playSfx(kind, sfxVol / 100);
    },
    [sfx, sfxVol],
  );
}
