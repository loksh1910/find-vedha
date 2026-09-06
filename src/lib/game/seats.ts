import type { SlotId } from "@/lib/roles";

export type GameSeat = { uid: string; name: string; pawns: string[] };

const slotToPawn = (slot: string) => (slot === "vedha" ? "vedha" : `d${slot.slice(1)}`);

/** Turn the lobby's `{ slot: uid }` claim map into per-player pawn lists. */
export function seatsFromClaims(
  claims: Partial<Record<SlotId, string>>,
  names: Record<string, string>,
): GameSeat[] {
  const byUid = new Map<string, string[]>();
  for (const [slot, uid] of Object.entries(claims)) {
    if (!uid) continue;
    const list = byUid.get(uid) ?? [];
    list.push(slotToPawn(slot));
    byUid.set(uid, list);
  }
  return [...byUid.entries()].map(([uid, pawns]) => ({
    uid,
    name: names[uid] ?? "Player",
    pawns,
  }));
}

export function controlsPawn(
  seats: GameSeat[],
  uid: string,
  pawnId: string,
): boolean {
  return seats.some((s) => s.uid === uid && s.pawns.includes(pawnId));
}

export function myPawns(seats: GameSeat[], uid: string | null): string[] {
  if (!uid) return [];
  return seats.find((s) => s.uid === uid)?.pawns ?? [];
}
