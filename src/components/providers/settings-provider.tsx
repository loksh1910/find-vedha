"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Motion = "full" | "reduced" | "off";
export type Contrast = "normal" | "high";

export type Settings = {
  sfx: boolean;
  sfxVol: number; // 0..100
  motion: Motion;
  contrast: Contrast;
};

const DEFAULTS: Settings = { sfx: true, sfxVol: 70, motion: "full", contrast: "normal" };
const KEY = "fv:settings";

type Ctx = Settings & {
  hydrated: boolean;
  reduceMotion: boolean;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let loaded: Settings = DEFAULTS;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) loaded = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
    } catch {
      /* keep defaults */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setSettings(loaded);
    setHydrated(true);
  }, []);

  // reflect onto <html> so CSS (and any non-React code) can react
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.motion = settings.motion;
    el.dataset.contrast = settings.contrast;
  }, [settings.motion, settings.contrast]);

  const set = useCallback(
    <K extends keyof Settings>(k: K, v: Settings[K]) => {
      setSettings((s) => {
        const next = { ...s, [k]: v };
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* private mode — session-only is fine */
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      hydrated,
      reduceMotion: settings.motion !== "full",
      set,
    }),
    [settings, hydrated, set],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
