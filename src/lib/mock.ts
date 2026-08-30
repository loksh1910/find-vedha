/* Static mock data for the Phase-1 front-of-house. Nothing here is real. */

export type Friend = {
  name: string;
  online: boolean;
  activity: "In a game" | "In a lobby" | "Online" | "Offline";
};

export type RecentGame = {
  date: string;
  role: "Vedha" | "Detective";
  result: "Won" | "Lost";
  players: number;
  rounds: number;
};

export const MOCK_FRIENDS: Friend[] = [
  { name: "Karthik", online: true, activity: "In a lobby" },
  { name: "Divya", online: true, activity: "Online" },
  { name: "Ashwin", online: true, activity: "In a game" },
  { name: "Priya", online: false, activity: "Offline" },
  { name: "Vetri", online: false, activity: "Offline" },
];

export const MOCK_RECENT_PLAYERS: string[] = ["Nithya", "Bala", "Sameer", "Ravi"];

export const MOCK_STATS = {
  played: 41,
  winRatePct: 56,
  asVedhaPct: 61,
  asDetectivePct: 52,
  streak: 3,
  tier: "Signal II",
} as const;

export const MOCK_RECENT_GAMES: RecentGame[] = [
  { date: "Aug 29", role: "Vedha", result: "Won", players: 6, rounds: 24 },
  { date: "Aug 27", role: "Detective", result: "Won", players: 5, rounds: 19 },
  { date: "Aug 27", role: "Detective", result: "Lost", players: 6, rounds: 24 },
  { date: "Aug 24", role: "Vedha", result: "Lost", players: 4, rounds: 12 },
  { date: "Aug 22", role: "Detective", result: "Won", players: 6, rounds: 21 },
];

/* --- Lobby bots ------------------------------------------------------ */

export type Bot = { id: string; name: string; avatarId: string };

export const LOBBY_BOTS: Bot[] = [
  { id: "bot-karthik", name: "Karthik", avatarId: "tile-2" },
  { id: "bot-divya", name: "Divya", avatarId: "tile-3" },
  { id: "bot-ashwin", name: "Ashwin", avatarId: "tile-4" },
  { id: "bot-priya", name: "Priya", avatarId: "tile-5" },
  { id: "bot-vetri", name: "Vetri", avatarId: "tile-6" },
];

/** Scripted bot claims during the 10s window (ms after selection starts → slot). */
export const BOT_CLAIM_SCRIPT: { at: number; botId: string; slot: import("./roles").SlotId }[] = [
  { at: 1600, botId: "bot-ashwin", slot: "t3" },
  { at: 3200, botId: "bot-divya", slot: "t1" },
  { at: 5200, botId: "bot-vetri", slot: "t5" },
  // Karthik & Priya + Vedha are left for the auto-fill to resolve.
];

/** Canned lobby chat so the panel isn't empty. */
export const LOBBY_CHAT_SEED: { at: number; from: string; text: string }[] = [
  { at: 400, from: "Karthik", text: "in!" },
  { at: 1400, from: "Divya", text: "who's being Vedha this time" },
  { at: 2600, from: "Ashwin", text: "not me, i always get caught" },
];
