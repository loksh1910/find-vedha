# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository. These instructions override default behavior — follow them exactly.

---

## Project

**Find Vedha** (working title) — a browser-based multiplayer social-deduction game: Scotland Yard–style hidden-movement mechanics on an original **Chennai-themed board**, wrapped in a chess.com-style social platform (private rooms, invite codes, lobby, live video + text chat, profiles, stats). No real IP — original character names, original board, no licensed content.

**References:** [SITEMAP.md](SITEMAP.md) is the original screen-and-state spec — thorough on intent, but **now behind the code** (predates the landing redesign, real backend, Phase 5–7). This file's **Build order** table + **Where things live** are the current source of truth for what exists. Still add new screens/states to SITEMAP.md when the user approves them, and give it a proper refresh pass when there's time.

**Current status (2026-09):** Next.js 16 + React 19 + Tailwind v4, **real Supabase backend wired** (project `kjtnzujbqrnakkkbvllj`). Phases 1–5 done, Phase 6 text chat done (video built but disabled), Phase 7 part-done. See the Build order table for per-phase status.

- **Phases 1–4 (done):** Landing → Auth → Dashboard → Create/Join → Lobby (5-phase machine) → transition → in-game screen, on the **real 199-node Chennai board** with the real pure-function engine (24 rounds, legal moves, ticket spend + handoff, Wildcard, Double-Move, reveal rounds, win/loss).
- **Phase 2 (done):** real Supabase auth (email/password + guest), rooms + invite codes, live Lobby over Realtime (roster / claims / ready / countdowns synced, host-driven phase machine, host migration), lobby text chat.
- **Phase 5 (done):** server-authoritative game state. Moves go through `/api/game/*` routes (service-role writer); clients read via the `get_game` RPC which **redacts Vedha's node + trail** (sentinel `-1`) for Detective viewers except on reveal rounds / at game end. The `games` table has RLS on with no policies.
- **Phase 6 (text done, video parked):** lobby + in-game chat are real (Realtime broadcast for live delivery + `room_chat` table for history; Detectives-only scope is DB-enforced). Peer video/audio via Daily is fully built but gated off behind `VIDEO_ENABLED = false` in `media-provider.tsx` — Daily's free tier needs a card on file; user chose to defer.
- **Phase 7 (done bar presence):** Results (`/room/[code]/results`, `/m/[id]`), Profile & stats (`/profile`, `/u/[username]`), Friends (`/friends`) all built and wired to real data (`matches` archive + `friendships`). The dashboard side column is real now too (recent games / friends / season stats). Missing: online-status pills + invite-to-lobby (need a presence/notification channel).

`npm run build` + `npm run lint` are kept clean.

---

## How to work on this project — process rules

1. **Phase discipline (see "Build order" below).** Currently in Phase 7 (Friends left) → Phase 8. Do not jump ahead.
2. **Per-screen layout is user-driven.** Before designing or coding **any** new screen, ask the user to describe the layout, or present a rough static mockup for them to react to. Build only after they confirm. **Never invent a layout on the user's behalf.** One screen at a time. The user is a designer; walk them step-by-step through any Supabase dashboard task (SQL Editor, Auth settings) — they will say they can't find files/settings.
   - Run every visual/UI decision through [`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md) — see "Frontend design approach" below.
3. **Incremental checkpoints.** Build one feature, confirm it works (`npm run dev` + the user reviews on localhost), commit, then move on. No giant untested piles of code.
4. **Always run `npm run build` before calling a change done** — it runs the TypeScript check that `dev` doesn't surface until you touch the page.
5. **Secrets go in env vars, never hardcoded.** Supabase keys, Daily.co keys → `.env.local` (gitignored). Prompt the user to paste keys when a phase needs them.
6. **Deployment is forbidden without explicit instruction** (see "Deployment rule").
7. Keep this file and SITEMAP.md current as decisions land.

---

## Frontend design approach

All UI work on this project follows **[`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md)** — read it in full before Phase 0 and re-read it before designing each screen. It is a project skill and should also be surfaced/invocable as `frontend-design` in normal sessions. Non-negotiables distilled from it:

- **No templated defaults.** Do not reach for the three AI-design clichés: (1) cream `#F4F1EA` + high-contrast serif + terracotta; (2) near-black + one acid-green/vermilion accent; (3) broadsheet hairline-rule columns with zero border-radius. Where the user's brief fixes a direction, follow it exactly; where it leaves an axis free, don't spend that freedom on a cliché.
- **Ground every choice in the subject.** This subject is a *hidden-chase game across a stylised Chennai transit map* — palette, type, structural devices, and motion should come from that world (transit maps, ticket stubs, route lines, the city), not from a generic dashboard kit.
- **Two-pass process.** Before coding a screen: brainstorm a compact token system — Color (4–6 named hex), Type (a characterful display face used with restraint + a body face + a utility/data face), Layout (prose + ASCII wireframe), and one **signature element** the screen is remembered by. Then critique that plan against the brief — revise anything that reads as a default and say what changed — *then* build, deriving every color/type value from the plan.
- **Spend boldness in one place.** One signature element per screen; everything around it stays quiet and disciplined. Remove one accessory before shipping.
- **Quality floor, unannounced:** responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected, motion used sparingly (over-animation reads as AI-generated).
- **Copy is design material.** Active voice, sentence case, name things by what the player controls ("Claim Vedha", "Ready"), an action keeps its name through the whole flow, errors state what happened and how to fix it, empty states invite action.
- Self-critique as you build — take screenshots via the browser preview tools and look at them.
- Keep design notes (what was tried, what was rejected and why) so later passes don't loop. Put them in `docs/design-notes.md` as they accumulate.

A **design system doc** (`DESIGN_SYSTEM.md`) will be created during Phase 0 once the first screen's token system is agreed, and every later screen must draw from it rather than re-inventing tokens.

### Visual direction (fixed)

- **Dark mode only.** There is no light theme — do not build a light palette, a theme toggle, or `prefers-color-scheme` light handling. Design the dark palette as the *only* palette (proper layered dark surfaces, not a inverted light theme). Settings > Appearance may offer contrast/accent tweaks, never a light mode.
- **Reference: chess.com.** The platform *shell* takes its cues from chess.com — calm, information-dense, board/game-centric, one restrained brand accent over a low-chroma dark UI, persistent left nav on desktop, a collapsible right rail on the play screen (tabs for moves / chat / players), stat-block profile pages with a game archive table, "Play" (here: Create / Join) given the most visual weight on the dashboard. Take the *structure and restraint*, not the literal green or the chess iconography — the identity still comes from the Chennai transit-map world per the design skill above.

---

## Tech stack (decided)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | App Router only, not Pages Router |
| Styling | **Tailwind CSS + shadcn/ui** (Radix primitives) | Standard, well-supported |
| Backend | **Supabase** — Postgres + Auth + Realtime + Row Level Security (one free account) | SQL for game state + stats; RLS is the key feature — it lets the DB physically withhold the Runner's position from Detective clients |
| Auth | Supabase Auth — email/password + Google. Sign-up also collects **username + avatar** (preset avatars for MVP; upload later) | |
| Realtime | Supabase Realtime — **one channel per room**: game state + presence + text chat | |
| Video chat | **Daily.co** prebuilt call widget (free tier) | Simpler than Agora / raw WebRTC; key added later via env var |
| Board rendering | Hand-built **SVG**, React state drives node highlight / pawn position / pan + zoom | No mapping library (Leaflet/Mapbox) — the board is abstract, not real geography |
| Hosting | **None.** `npm run dev` → `localhost:3000` only | Supabase's cloud free tier for backend data is acceptable (the app is never deployed); local Docker Supabase is an option if the user wants zero cloud |

---

## Naming & terminology

- Product: **Find Vedha**.
- The hidden/evading player: **Runner**; in-world character name **Vedha**.
- The pursuing players: **Detectives** — they control **5 Detective pawns** between them. (Settled term, per the user — it's the authentic Scotland Yard word. The brief said "Tracker"; the user briefly floated "Chaser". Do not reintroduce either.)
- Detective slot colors: **D1 Blue · D2 Orange · D3 Purple · D4 Pink · D5 Cyan.** Deliberately avoid yellow/green/red — those are reserved for transport lines. CSS vars are `--tr-1`…`--tr-5` (kept short). (Proposal; finalize in Phase 0.)
- Transport tiers: **Auto** = yellow lines · **Bus** = green lines · **Metro** = red lines.
- **"Who is Vedha" is PUBLIC** from the lobby onward. **"Where Vedha is" is HIDDEN** during play except on reveal rounds. Never conflate the two.

### Board
- Exactly **199 numbered nodes**. **No named landmark stations** — deliberate deviation from the brief's §3 boilerplate, per the user's explicit instruction ("just nodes and a neat map bg"). Background art should *read* as Chennai (east-edge coastline = Bay of Bengal, two abstract river curves) with **no labels and no gameplay effect**.
- A node's available transports = **whichever colored edges touch it**. Do not store a separate "allowed transport" field per node. When the board graph is built (Phase 3), follow the density pattern: Auto everywhere (dense, short hops), Bus at busier nodes, Metro only at major hubs; **no node has Bus or Metro without also having Auto**.
- The graph also carries a few **river / black-line edges** — long shortcut connections, `transport: "river"` (Wildcard-only), roughly following the two Chennai river curves. Author ~2–4 of them in Phase 3.

---

## Complete ruleset — keep every number exact

| Rule | Value |
|---|---|
| Players per room | 2–6 |
| Pawns | 1 Runner (Vedha) + 5 Detective pawns. With <6 players, a player controls more than one Detective pawn. |
| Board nodes | exactly 199 |
| Detective tickets (per pawn) | **10 Auto · 8 Bus · 4 Metro** |
| Runner tickets | **4 Auto · 3 Bus · 3 Metro · 5 Wildcard · 2 Double-Move** |
| Wildcard | Usable on any transport type; **hides which transport type was used** from Detectives. (Destination is hidden every round anyway.) Also the **only** ticket that can cross a **river / black-line edge** — long Wildcard-only shortcut routes designed into the board (**in scope**; authored with the board graph in Phase 3). |
| Double-Move | Runner makes **two consecutive moves** before Detectives respond. If a reveal round lands on the **first** of the two moves, the reveal happens after that first move. |
| Start positions | Random draw from a fixed pool of **~20 designated start nodes** spread across the map. Runner + 5 Detectives all draw **distinct** nodes from that pool. |
| Rounds | **24** |
| Reveal rounds | **3, 8, 13, 18, 24.** Vedha's exact node is shown to all Detectives, then hidden again as soon as Vedha's next move is made. |
| Turn order | Runner moves first each round, then Detectives move **sequentially** (one at a time, each move visible to the others). |
| Movement | **One stop per ticket** — cannot skip a stop to a further one on the same route. **Every player must move each turn** — no passing/staying. |
| Detective blocking | A Detective **cannot** move onto a node occupied by another Detective. |
| Catch | Any Detective landing on Vedha's exact node → **Detectives win immediately.** Same if Vedha is forced onto an occupied Detective node. |
| Stuck Detective | A Detective with no usable ticket for any connection at its node is **stuck for the rest of the game** — still occupies/blocks that node, **auto-skipped** in turn rotation, visually marked "stuck". |
| Runner win | Survives through the end of **round 24**, OR **every Detective can no longer move** before round 24 completes (out of usable tickets, or abandoned and not taken over). |
| Runner stuck (no legal move) | **Detectives win** — matches the official rule (a Mr. X who cannot move is captured). Rare in practice now that Vedha gains Detectives' spent tickets. |
| Ticket handoff | **Implemented (real Scotland Yard rule).** When a Detective spends an Auto / Bus / Metro ticket, that ticket is added to Vedha's wallet and Vedha may spend it on a later turn. Vedha's **Wildcard and Double-Move counts are never increased this way** (they stay at the fixed 5 / 2). Detectives never get tickets back — their wallets only shrink. |

### Hidden-info enforcement (non-negotiable)
The Runner's real position must be **server-authoritative** and never sent to Detective clients except on reveal rounds / at game end. **Implemented (Phase 5):** the full `GameState` lives in the `games` table (RLS on, no policies — clients can't read it directly). Writes go through service-role API routes (`/api/game/{start,move,double,reset}`) that re-validate every move with the same pure `engine.ts` functions. Clients read only via the `get_game(code)` SECURITY DEFINER RPC, which returns Vedha's node as `-1` and rewrites non-revealed trail entries to `-1` unless the caller controls Vedha, it's a reveal round, or the game is over. `games` is deliberately **not** in the Realtime publication (a row-change payload would leak the raw state) — the API routes send a contentless `game` broadcast on `room:<CODE>` and clients re-fetch.

---

## Where things live

| Path | What |
|---|---|
| `src/app/` | routes. `(app)/` = route group with the left-rail shell + auth guard (`useAppState`). `room/[code]/` (Lobby, `play/`, `results/`) and `m/[id]/` sit **outside** the group — full-bleed, no guard. |
| `src/app/api/game/{start,move,double,reset}/route.ts` | server-authoritative game endpoints. Auth + room-membership gate via `roomContext()`; write with the service-role client; `pingRoom()` broadcasts a contentless `game` event. `move` also archives a `matches` row on game-over. |
| `src/app/api/daily/room/route.ts` | Daily room + meeting-token minting. Inert while `VIDEO_ENABLED = false`. |
| `src/proxy.ts` | Next 16 middleware (renamed from `middleware.ts`) — refreshes the Supabase session cookie. Does not redirect; the `(app)` layout owns routing. |
| `src/lib/supabase/` | `client.ts` (`createBrowserClient`), `server.ts` (`createServerClient` w/ cookies), `admin.ts` (service-role, **server only**, sole writer of `games`/`matches`). API keys are the new `sb_publishable_…` / `sb_secret_…` format. |
| `supabase/migrations/` | `20260906120000_phase2_auth_rooms.sql` (profiles, rooms, room_members, `is_room_member`/`is_room_host`/`room_by_code` helpers, RLS, `handle_new_user` trigger, Realtime publication) · `20260906130000_phase5_games.sql` (`games` + `get_game`) · `20260907120000_phase6_chat.sql` (`room_chat` + `is_room_detective`/`get_chat`/`post_chat`) · `20260907130000_phase7_matches.sql` (`matches` + `get_match`/`get_latest_match`/`get_my_matches`/`get_player_stats`) · `20260907140000_phase7_friends.sql` (`friendships` + `send_friend_request`/`respond_friend_request`/`remove_friend`/`list_friends`/`list_friend_requests`/`list_recent_players`) · `20260907150000_phase7_solo_matches.sql` (`record_match` — the solo client calls it on game-over; online games are still written by `/api/game/move`). All idempotent; the user runs them by hand in the SQL Editor. |
| `src/components/providers/app-state-provider.tsx` | real Supabase auth + rooms. `useAppState()` → `session` (`{username,avatarId}` from `profiles`), `userId`, `isGuest`, `hydrated`, `signInWithPassword`/`signUp`/`signInAsGuest`/`signOut`, `createRoom`/`joinRoom`/`findRoom`. |
| `src/components/lobby/` | `lobby-client.tsx` (5-phase machine; multiplayer mirrors the realtime `rooms` row, host drives the phase machine + host migration) · `use-lobby-channel.ts` (per-room `postgres_changes` channel for row + roster; delegates chat to `useRoomChat`) · slot card + transition. |
| `src/lib/realtime/use-room-chat.ts` | shared chat hook (lobby + in-game). Live delivery on `chat:<CODE>` / `chat:<CODE>:det` broadcast channels; history + durable writes via `get_chat`/`post_chat`. De-dupes by message id; auto-resubscribes. |
| `src/components/game/` | in-game screen. `game-provider.tsx` — networked: loads via `get_game`, subscribes to the `game` ping, moves via the API routes; solo: fully local. Exposes `soloTools` (dev toggles, solo only), `chat`/`sendChat`/`chatName`/`chatDet`, `moveError`. `game-screen.tsx` assembles HUD / board / right-rail / ticket panel. `chat-panel.tsx` (`LiveChat` for MP, `SoloChat` scripted demo for solo). `game-over-overlay.tsx` (Exit game → `/api/game/reset`; multiplayer "View results"). |
| `src/components/results/results-screen.tsx` | Results screen — reads `get_latest_match` (from `/room/[code]/results`) or `get_match` (from `/m/[id]`). |
| `src/components/profile/profile-screen.tsx` | Profile & stats — `profiles` row + `get_player_stats`; own profile also loads `get_my_matches`. Served at `/profile` (self) and `/u/[username]`. |
| `src/components/friends/friends-screen.tsx` | Friends — the `*_friend*` RPCs. `/friends`. |
| `src/components/providers/settings-provider.tsx` | `useSettings()` — sfx / sfxVol / motion / contrast, localStorage-persisted, wrapped at the **root** layout (so the game screen gets it). Reflected onto `<html data-motion\|data-contrast>`; `globals.css` acts on those. |
| `src/components/settings/settings-screen.tsx` | `/settings`. `app-state-provider.updateProfile({username?,avatarId?})` backs the account edits. |
| `src/lib/sound.ts` + `src/lib/use-sfx.ts` | synthesised SFX (Web Audio, no files). `game-provider` fires cues off state diffs. |
| `src/components/shell/intro-card.tsx` | dashboard first-run panel (localStorage `fv:seen-intro`). |
| `src/app/(app)/dashboard/page.tsx` | now loads `get_my_matches` / `list_friends` / `get_player_stats` for its side column (was `src/lib/mock.ts`). |
| `src/lib/game/` | `types.ts` (GameState) · `engine.ts` (pure: `createGame`, `legalMoves`, `applyMove`, `declareDoubleMove`, `autoDetectiveMove`, `lastKnownVedhaNode`) · `seats.ts` (`GameSeat` = `{uid,name,pawns[]}`, `seatsFromClaims`, `controlsPawn`, `myPawns`) · `server.ts` (`import "server-only"` — `roomContext`, `pingRoom`). |
| `src/lib/board/board-data.ts` | the authored **199-node** Chennai graph (procedural generator, `TARGET = 199`). `Board` / `BoardNode` / `BoardEdge` shape; `nodeById(id)` guards out-of-range (and the `-1` redaction sentinel) → returns `BOARD.nodes[0]`. |
| `src/lib/roles.ts` | slot defs (`ALL_SLOTS`, `DETECTIVE_SLOTS`, `VEDHA_SLOT`), colours, `autoFill`. Slot ids `vedha` / `t1`…`t5`; pawn ids `vedha` / `d1`…`d5` (`t{n}` → `d{n}`). Slot CSS vars `--tr-1`…`--tr-5`. |
| `src/lib/mock.ts` | leftover static mock data — still feeds the **dashboard** side column (recent games / friends / stats snapshot). Replace when those get wired. |
| `src/app/globals.css` + `DESIGN_SYSTEM.md` | dark-only tokens. In-game palette: `--game-canvas` (near-black), `--game-accent` (cyan), `--reveal` (magenta), muted transport tokens `--t-auto/-bus/-metro/-river`. **No `text-transform` anywhere** — labels are sentence case (per user: "no capital letters" = no uppercasing). |

---

## Screens (summary — full detail in SITEMAP.md)

**Build now (Landing → Lobby → transition):**
- `/` Landing · `/how-to-play` Manual (+ reusable `<ManualDialog>`) · `/signup` (username + avatar) · `/login` · `/auth/reset*` · `/auth/callback`
- `/dashboard` — Create Room, Join-by-code, active rooms, friends, recent players, stats snapshot, match-history summary, settings
- `/rooms/new` — room name, max players (2–6), AI-fill toggle (disabled/"coming soon") → invite code + link
- `/join` and `/room/[code]/join` — with states: invalid / expired / room full / already started / already a member
- `/room/[code]` — **the Lobby** (see its special rules below)
- Lobby → game **transition animation** (transient, not a route)

**Built (Phase 4–7):**
- `/room/[code]/play` — In-Game (board, HUD with Manual + Leave, colour-coded ticket panel, 24-round travel log, reveal-round + stuck-pawn state, right-rail Log / Players / Chat tabs). Solo shows a view-as toggle + Auto-Detectives demo; networked play hides those. No turn timer, no deduction assist, no screen-share.
- `/room/[code]/results` and `/m/[id]` — outcome headline, Vedha's revealed route (mini diagram + ticket-tagged station list), per-player "the chase" line, reveal-round strip, Rematch / Back to lobby / Dashboard.
- `/profile` (self) and `/u/[username]` — avatar + record header, stat band (Games / Win rate / As Vedha / As Detective), last-10 form strip; own profile also has the match-history table (rows → `/m/[id]`).
- `/friends` — add by username, incoming requests (accept/decline), friends list (Remove), "recent players" you've been in a match with (one-click Add). Backed by `friendships` + the `*_friend*` RPCs. **No online-status pills or invite-to-lobby yet** — needs a presence/notification channel.
- `/dashboard` side column — recent games (`get_my_matches`, split into "With friends" / "With computer" tabs by `mode`; rows open `/m/[id]`), friends (`list_friends` + an "Add friends" button → `/friends`), season stats (`get_player_stats`). No longer mock.

**Not built yet:**
- `/settings` — `PlaceholderScreen` (Phase 8). "Edit profile" links here.
- **Presence / notifications** — no channel for "who's online / in a lobby / in a game", so friend status and invite-to-lobby aren't built.
- **Disconnect / abandonment handling** during a game (spec below) — not implemented. Currently a leaver's pawn just stops; nobody can take it over; no Vedha-drop pause.
  - *Spec:* anyone can `Leave game` any time. A **Detective** leaving → pawn stays put, abandoned, blocks its node, counts as stuck. **Any remaining player can click an abandoned pawn to take it over** (keeps node + tickets). A **Vedha** drop **pauses the game** with a blocking overlay + `Exit game` CTA → **Detectives win**. Vedha pressing `Leave game` = instant Detectives win.
- Global: toast system, per-panel skeletons, offline banner, 404/500 — mostly not built.

**No `/room/[code]/reveal` route** — role assignment happens publicly inside the Lobby, not on a separate screen.

---

## The Lobby — special rules (non-obvious; follow exactly, do not simplify)

Single screen, five phases:

- **Phase A — Open roster.** Players join; list updates live. **Host-only controls (this phase only):** kick player, toggle AI-fill, adjust max players (2–6). Host CTA: **"Lock roster & start role selection"** (≥2 players). *(That the host triggers this is an assumption — pending user confirmation.)*
- **Phase B — Role selection (10 seconds, PUBLIC).** Prominent 10-second countdown for everyone. One **Vedha** slot + five color-tagged **Detective** slots. Any player may claim the Vedha slot or a specific Detective slot; claims are visible to all and lock to others; a player may release and re-pick within the 10s. With <6 players, a player may hold more than one slot.
- **Phase C — Roles locked / auto-fill.** On timer expiry the platform **randomly assigns all unclaimed slots** to players with room — **including randomly choosing Vedha if nobody claimed it** — distributing multiple Detective slots as needed so all 5 are owned. Lobby then shows a clear public assignment ("Vedha: <player>", each Detective color → its player).
- **Phase D — Ready-up.** Each player gets a **Ready toggle**. Host may still `Close room`; **max-players / kick / AI-fill are now locked**.
- **Phase E — Auto-start.** When **all** players are Ready, a **5-second countdown** auto-starts (cancels if anyone un-readies or disconnects). At zero → the Lobby→game transition animation → board view.

A **"Manual" button is always visible** in the Lobby — opens the full rules reference (`<ManualDialog>`) without leaving the Lobby.

Edge cases: player leaves during B/C (slot re-opens / re-fills; below 2 players → fall back to Phase A); player disconnects (grey row + grace timer, un-readies them, cancels the 5s countdown); host leaves (migrate host to next player by join order); room closed by host (all → `/dashboard` + toast).

---

## Build order (phases)

| Phase | What | Status |
|---|---|---|
| **−1** | Full sitemap — SITEMAP.md. | done (may drift; see below) |
| **0** | Per-screen layout design, user-driven. | done through Lobby + in-game + Phase 7 mockups |
| **1** | Front-of-house UI (Landing → Lobby → transition). | **done** (+ landing card-ring redesign, hero slide-in) |
| **2** | Supabase: auth (username/avatar/guest), rooms, invite codes, Lobby realtime, host controls, lobby chat. | **done** |
| **3** | The authored **199-node Chennai graph** (coords, transport edges incl. Wildcard-only river edges, ~20 start nodes). | **done** (+ muted map redesign, road-following pending-move highlight) |
| **4** | In-game engine: board from data, movement + tickets + handoff, Wildcard, Double-Move, hidden-Vedha, reveal rounds, win/loss, end-game overlay. | **done** on the real board |
| **5** | Server-authoritative move sync + RLS hidden info. | **done** — API routes + `get_game` redaction; `+ /api/game/reset` returns a reusable lobby after "Exit game" |
| **6** | Social layer: video (Daily.co) + text chat on real channels. | **text done** (lobby + in-game, live broadcast + `room_chat` persistence, DB-enforced Detectives-only scope). **Video built but OFF** (`VIDEO_ENABLED = false` — Daily needs a card; user deferred to last). |
| **7** | Results, profiles, stats, match history, friends. | **done bar presence** — Results, Profile/stats/history, Friends (add/accept/decline/remove + recent players) all built on `matches` + `friendships`; dashboard side column wired to real data. Left: online-status + invite-to-lobby (need a presence/notification channel). |
| **8** | Polish (dark-only): `/settings`, sound, move animations, node hover, smooth zoom, onboarding. | **done (first pass)** — `/settings` (Appearance / Sound / Account) + `settings-provider` (persists, drives `<html data-motion\|data-contrast>`); synthesised SFX (`src/lib/sound.ts` + `useSfx`); pawn-slide + eased button-zoom + node hover; dashboard `IntroCard`. Tuning (sound design, animation feel, a fuller high-contrast board) is iterative. Board already had wheel/drag pan+zoom. |

**Remaining:** presence channel (friend online-status + invite-to-lobby) → in-game disconnect/abandonment handling → (last) Daily video back on or a raw-WebRTC rebuild. Phase 8 polish is iterative from here (sound design, animation feel). Turn timer stays out of scope.

**Solo "Play with computer"** still has no real AI — only the HUD "Auto Detectives" demo toggle and a scripted `SoloChat`. Real AI Detectives are a **v2 non-goal**.

---

## Non-goals (do not build unless the user asks)

- **AI bot Detectives** — v2 feature. The "Fill empty Detective slots with AI?" toggle exists in the UI but is **disabled / "Coming soon"** for MVP. Unclaimed slots go to human players (one player can hold several).
- **Public matchmaking / lobbies** — invite-code only, friends-only.
- **Screen-share** — no button at all (dropped).
- **In-game turn timer** — deferred; not built, not decided. The game ends only on escape (round 24), all Detectives stuck, or a catch.
- **In-game deduction assist** — no possible-location cloud, no reachability / danger overlays, no suggestion markers. Both sides deduce unaided from the board + travel log + voice/chat. (Highlighting your own legal destinations on your turn is fine — that's move legality, not assist.)
- **Avatar upload** — preset avatars only for MVP.
- **Deploying anywhere.** See below.

---

## Deployment rule — IMPORTANT

**Do not deploy this app to any public hosting (Vercel, Netlify, etc.) at any point unless the user explicitly says so.** Everything runs on `localhost` (`npm run dev`) so the user can review privately at each checkpoint. Only deploy on explicit instruction. (Using Supabase's hosted free tier as the backend database is fine — that is not "deploying the app".)

---

## Commands

```bash
npm run dev      # start dev server (Turbopack, http://localhost:3000)
npm run build    # production build — runs the TypeScript check. Does NOT run ESLint (Next 16).
npm run lint     # ESLint — run this separately before calling a change done
```

Run **both** `npm run build` and `npm run lint` before considering a change done.

---

## Open questions

1. **Rematch behaviour** — the Results screen "Rematch — same players" currently calls `/api/game/start?force` (re-deals the same roles, new board, straight into `/play`, host only). "Back to lobby" resets the room to roster so roles can be re-picked. Confirm this split is what's wanted.
2. **Profile stat set** — Games / Win rate / As Vedha / As Detective + last-10 form. No rating/ELO (assumed v2).
3. **Friends "Invite"** — does it drop a friend straight into your lobby, or send a tap-to-join notification? (open — decide when building Friends)

**Resolved:** Pursuers are **Detectives**. Runner-with-no-legal-move → Detectives win. River / Wildcard-only edges → in scope. Ticket handoff → in scope. Role-selection timer is triggered by the host ("Lock roster & start role selection") — **implemented**. Video → deferred to last (Daily card requirement). Casing → sentence case, never uppercase.

---

## Known gotchas (already hit — don't rediscover)

1. **Next 16's `eslint-config-next` makes `react-hooks/set-state-in-effect` and `react-hooks/refs` hard errors.** Synchronous `setState` in an effect body, and reading `ref.current` during render, both fail `npm run lint`. Where the pattern is genuinely correct (one-time `localStorage` hydration; a timer/bot-driven phase advance in the Lobby), wrap the block in `/* eslint-disable react-hooks/set-state-in-effect */ … /* eslint-enable */` with a one-line reason — see `app-state-provider.tsx` and `lobby-client.tsx`. Prefer moving `setState` into event handlers, and prefer `useState` over a `ref` for anything read during render (the Lobby's countdown `deadline` is state for this reason).
2. **`next build` does not run ESLint in Next 16.** A build can pass with lint errors. Always run `npm run lint` too.
3. **Reading `localStorage` during render (even inside `useMemo`) causes an SSR/first-client-render hydration mismatch.** Hit this in `lobby-client.tsx` — `room.name` from `findRoom()` (which reads `localStorage`) rendered `"Room ABC123"` on the server and the real created-room name on the client. Gate any such lookup on the provider's `hydrated` flag and return the SSR-matching fallback until it's true.
4. **Scaffolding into `C:\Users\lokes\Desktop\SLY` directly fails** — `create-next-app` rejects the capitalised folder name ("npm naming restrictions"). It was scaffolded in a temp dir as `find-vedha` and moved in; `package.json` `name` is `find-vedha`.
5. **`preview_start` resolves `.claude/launch.json` from the session's primary working directory (the Loku project), not from SLY** — so `preview_start({ name: "find-vedha" })` starts the wrong server. Run `npm run dev` via a background shell and point the browser at `http://localhost:3000` with `preview_start({ url: … })` / `navigate` instead.
6. **Verifying the in-game screen in the browser tool is fiddly.** With a viewport emulation larger than the pane, screenshots look like the layout collapsed and synthetic `ref`-clicks miss. It doesn't — `getBoundingClientRect()` is ground truth (the game screen fills `h-dvh` correctly). Verify with `javascript_tool` (read state, dispatch clicks on elements) and reset to the `desktop` preset for clean screenshots. The game screen is desktop-first (≥1280px comfortable).
7. **The demo `autoDetectiveMove` must never read Vedha's real node** — it only knows the last *revealed* node (else it wanders). Early versions pathed straight to `state.pawns.vedha.node` and caught Vedha on round 1 every time.
8. **`react-hooks/refs` also bans `useRef(createClient()).current`** — call a factory in `useRef`'s init and read `.current` in render → hard lint error. Use `const supabase = useMemo(() => createClient(), [])` everywhere instead.
9. **Supabase `signOut()` default scope is `global`** — revokes *every* session for that user, which logs the browser out from under you during SDK test scripts. Use fresh short-lived clients in scripts and avoid `signOut()` (or pass `{ scope: 'local' }`).
10. **`INSERT … RETURNING` re-checks the SELECT RLS policy on the new row.** A brand-new `rooms` row has no members, so the rooms SELECT policy is `using (is_room_member(id) or host_id = auth.uid())` — the `or host_id` is what lets a `createRoom` insert return. `room_members` join uses a plain `.insert` (an upsert with `ignoreDuplicates` tripped RLS) and treats error `23505` as "already a member".
11. **Realtime: `postgres_changes` vs `broadcast`.** `postgres_changes` respects row-level RLS but ships *all* columns of a changed row — so `games` is kept out of the publication (it would leak state) and clients re-fetch on a contentless `broadcast`. `broadcast` is ephemeral (no history) — lobby/game chat uses it for live delivery and a `room_chat` table for history. Mixing `postgres_changes` + `broadcast` on one channel is flaky across HMR/reconnect; keep chat on its own `chat:<CODE>` channel.
12. **A `to_jsonb(row)` inside a SECURITY DEFINER RPC serialises *every* selected column** — if the subquery also selects a sort key, it lands in the payload. Build the object with `jsonb_build_object(...)` and aggregate just that column (`jsonb_agg(x.msg order by x.sortkey)`), or alias every column to the camelCase the client expects.
13. **`supabase.rpc()` / query builders are thenables, not Promises** — no `.catch()`. Use `try/catch` around `await`, or `.then(ok, err)`. A missing RPC resolves as `{ data: null, error }` (not a throw), so guard with `if (Array.isArray(data))`.
14. **Daily.co free tier needs a card on file** — join fails with `account-missing-payment-method` and `GET /v1/` shows `config.allow_plan_free: false`. All video is gated behind `VIDEO_ENABLED` in `media-provider.tsx` until that's sorted.
15. **The browser preview pane blocks `getUserMedia` entirely** and its screenshot capture sometimes freezes on the first frame after a scroll — verify page content with `javascript_tool` / `read_page`, not screenshots. Real-user camera tests need `claude-in-chrome` (their actual Chrome).
16. **Standalone Node test scripts can't `import` from `src/`** (the `@/` path alias). Drive setup through the API routes / the browser, hit the RPCs directly with `@supabase/supabase-js`, or hand-craft `GameState` objects. Test users live at `*@fvtest.dev`.
17. **Migrations are run by hand.** There's no `supabase` CLI wired — paste each `supabase/migrations/*.sql` into the dashboard SQL Editor. All are written `create … if not exists` / `create or replace` so they're safe to re-run.

## Design notes / refinements to make

- **Results "the chase" list** — one player holding several Detective pawns shows as a single row labelled with just the first pawn ("D1"). Fix the label (e.g. "D1–D5") or drop the per-pawn chip for multi-pawn seats.
- **`src/lib/mock.ts`** is now unused (dashboard was wired to real RPCs). Delete it and the `MOCK_*` exports when convenient.
- **In-game responsive** — desktop-first; narrow widths overflow horizontally. Not designed for mobile yet.
- **SITEMAP.md is stale** — it predates the landing redesign, real auth/rooms/lobby-realtime, Phase 5 server-authority, chat, and the Results/Profile screens. Treat CLAUDE.md's Build order table + "Where things live" as current; refresh SITEMAP.md before leaning on it.
- Design-notes log lives at `docs/design-notes.md` once we start iterating on screens.
