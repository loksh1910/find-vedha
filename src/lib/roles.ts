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
  signal: "#45cfe0",
  ok: "#57c08a",
  danger: "#e5657b",
  line: "#2a2a2a",
  lineStrong: "#363636",
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
  colour: "Cyan",
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
 * - The Vedha player only ever holds Vedha; Detective players may hold 2+
 *   Detective slots (that's how < 6 players still cover all five).
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

  const kindOf = (id: SlotId) => slotDef(id).kind;
  const holds = (pid: string, kind: "vedha" | "detective") =>
    (Object.keys(result) as SlotId[]).some(
      (k) => result[k] === pid && kindOf(k) === kind,
    );
  const heldCount = (pid: string) =>
    Object.values(result).filter((v) => v === pid).length;

  // re-scan each pass, since seating Vedha can free up Detective slots
  for (let guard = 0; guard < 50; guard++) {
    const open = shuffle(ALL_SLOTS.map((s) => s.id).filter((id) => !result[id]));
    if (open.length === 0) break;

    for (const slot of open) {
      const kind = kindOf(slot);
      // a Vedha slot can't go to someone holding a Detective, and vice versa
      const pool = shuffle(playerIds).filter((pid) =>
        kind === "vedha" ? !holds(pid, "detective") : !holds(pid, "vedha"),
      );
      if (pool.length === 0) {
        // everyone is constrained — seat the least-loaded player and strip the
        // claims that now conflict (they get refilled on the next pass)
        const pick = [...shuffle(playerIds)].sort(
          (a, b) => heldCount(a) - heldCount(b),
        )[0];
        for (const k of Object.keys(result) as SlotId[]) {
          const conflicts =
            kind === "vedha" ? kindOf(k) === "detective" : kindOf(k) === "vedha";
          if (result[k] === pick && conflicts) delete result[k];
        }
        result[slot] = pick;
        continue;
      }
      pool.sort((a, b) => heldCount(a) - heldCount(b));
      result[slot] = pool[0];
    }
  }
  return result;
}

/** Which player (if any) currently holds a given slot, plus its definition. */
export function assignmentsFor(
  claims: Partial<Record<SlotId, string>>,
): { slot: SlotDef; playerId?: string }[] {
  return ALL_SLOTS.map((slot) => ({ slot, playerId: claims[slot.id] }));
}
