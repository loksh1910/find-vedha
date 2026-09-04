/* Role / slot model for the Lobby. See SITEMAP.md §2.F and CLAUDE.md. */

export type SlotId = "vedha" | "t1" | "t2" | "t3" | "t4" | "t5";

export type SlotDef = {
  id: SlotId;
  kind: "vedha" | "detective";
  /** Display name of the slot. */
  label: string;
  /** Detective index 1..5 (undefined for Vedha). */
  n?: number;
  /** Colour name shown to players. */
  colour: string;
  /** CSS custom-property name for the slot colour. */
  varName: string;
  /** Hex mirror of the token, for SVG / inline styles only. */
  hex: string;
};

/** Hex mirrors of the design tokens — SVG/canvas only, never for DOM styling. */
export const HEX = {
  signal: "#f5b23e",
  ok: "#57c08a",
  danger: "#e5657b",
  line: "#2e3945",
  lineStrong: "#3b4855",
  surface: "#151515",
  muted: "#9ba8b5",
  faint: "#6a7683",
  tAuto: "#e6b12e",
  tBus: "#3e9b4f",
  tMetro: "#ce4b4b",
  tr1: "#3e9bff",
  tr2: "#8a7bff",
  tr3: "#c06bf0",
  tr4: "#ee5fa3",
  tr5: "#28c2a8",
} as const;

export const VEDHA_SLOT: SlotDef = {
  id: "vedha",
  kind: "vedha",
  label: "Vedha",
  colour: "Amber",
  varName: "--signal",
  hex: HEX.signal,
};

export const DETECTIVE_SLOTS: SlotDef[] = [
  { id: "t1", kind: "detective", label: "Detective 1", n: 1, colour: "Azure", varName: "--tr-1", hex: HEX.tr1 },
  { id: "t2", kind: "detective", label: "Detective 2", n: 2, colour: "Indigo", varName: "--tr-2", hex: HEX.tr2 },
  { id: "t3", kind: "detective", label: "Detective 3", n: 3, colour: "Violet", varName: "--tr-3", hex: HEX.tr3 },
  { id: "t4", kind: "detective", label: "Detective 4", n: 4, colour: "Magenta", varName: "--tr-4", hex: HEX.tr4 },
  { id: "t5", kind: "detective", label: "Detective 5", n: 5, colour: "Teal", varName: "--tr-5", hex: HEX.tr5 },
];

export const ALL_SLOTS: SlotDef[] = [VEDHA_SLOT, ...DETECTIVE_SLOTS];

export function slotDef(id: SlotId): SlotDef {
  return ALL_SLOTS.find((s) => s.id === id)!;
}

/**
 * Fill every unclaimed slot at the end of the 10s selection window.
 * - Players holding no slot are served first (fairness).
 * - Vedha, if unclaimed, is assigned like any other slot.
 * - With < 6 players some players end up holding 2+ Detective slots.
 * `rand` lets callers pass a seeded RNG for deterministic demos/tests.
 */
export function autoFill(
  playerIds: string[],
  claims: Partial<Record<SlotId, string>>,
  rand: () => number = Math.random,
): Record<SlotId, string> {
  const result: Record<SlotId, string> = { ...(claims as Record<SlotId, string>) };
  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const openSlots = shuffle(ALL_SLOTS.map((s) => s.id).filter((id) => !result[id]));
  const heldCount = (pid: string) =>
    Object.values(result).filter((v) => v === pid).length;

  for (const slot of openSlots) {
    const pool = shuffle(playerIds);
    pool.sort((a, b) => heldCount(a) - heldCount(b));
    result[slot] = pool[0];
  }
  return result;
}

/** Which player (if any) currently holds a given slot, plus its definition. */
export function assignmentsFor(
  claims: Partial<Record<SlotId, string>>,
): { slot: SlotDef; playerId?: string }[] {
  return ALL_SLOTS.map((slot) => ({ slot, playerId: claims[slot.id] }));
}
